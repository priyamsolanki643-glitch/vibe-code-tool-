import '../utils/env';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { LLMService } from './llm.service';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isLocalFallback = !supabaseUrl || !supabaseKey;

let supabase: any = null;
const fallbackFilePath = path.join(process.cwd(), 'database.json');

try {
  if (!isLocalFallback && supabaseUrl && supabaseKey) {
    console.log('VECTOR_SERVICE: Connecting to Supabase at', supabaseUrl);
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.log('VECTOR_SERVICE: Running in Local Fallback mode using database.json');
  }
} catch (error) {
  console.error('CRITICAL ERROR IN VECTOR_SERVICE INIT:', error);
}

export interface UserMemory {
  id?: string;
  user_id: string;
  mission_name: string;
  locked_path: string;
  profile_text: string;
  embedding?: number[];
  outcome_summary: string;
  success_rate: number;
  created_at?: string;
}

type LocalDbShape = {
  missions: any[];
  consistency_log: any[];
  market_reports: any[];
  chat_threads: any[];
  messages: any[];
  user_memories: UserMemory[];
};

function getEmptyLocalDb(): LocalDbShape {
  return {
    missions: [],
    consistency_log: [],
    market_reports: [],
    chat_threads: [],
    messages: [],
    user_memories: []
  };
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || b.length === 0) return 0;
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class VectorService {
  private static readLocalDb(): LocalDbShape {
    try {
      if (!fs.existsSync(fallbackFilePath)) {
        return getEmptyLocalDb();
      }

      const raw = fs.readFileSync(fallbackFilePath, 'utf8');
      const parsed = JSON.parse(raw);

      return {
        missions: Array.isArray(parsed.missions) ? parsed.missions : [],
        consistency_log: Array.isArray(parsed.consistency_log) ? parsed.consistency_log : [],
        market_reports: Array.isArray(parsed.market_reports) ? parsed.market_reports : [],
        chat_threads: Array.isArray(parsed.chat_threads) ? parsed.chat_threads : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        user_memories: Array.isArray(parsed.user_memories) ? parsed.user_memories : []
      };
    } catch (e) {
      console.error('VectorService: Error reading local database', e);
      return getEmptyLocalDb();
    }
  }

  private static writeLocalDb(db: LocalDbShape) {
    try {
      fs.writeFileSync(fallbackFilePath, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('VectorService: Error writing local database', e);
    }
  }

  private static readLocalMemories(): UserMemory[] {
    return this.readLocalDb().user_memories;
  }

  private static writeLocalMemories(memories: UserMemory[]) {
    const db = this.readLocalDb();
    db.user_memories = memories;
    this.writeLocalDb(db);
  }

  static async init() {
    try {
      if (isLocalFallback && !fs.existsSync(fallbackFilePath)) {
        this.writeLocalDb(getEmptyLocalDb());
      }

      const currentCount = await this.getMemoriesCount();
      const shouldSeed =
        process.env.SEED_VECTOR_MEMORIES === 'true' ||
        process.env.NODE_ENV === 'development';

      if (currentCount === 0 && shouldSeed) {
        console.log('VectorService: Seeding initial Hive Mind memories...');
        await this.seedMemories();
      }
    } catch (e) {
      console.error('VectorService: Initialization warning', e);
    }
  }

  private static async getMemoriesCount(): Promise<number> {
    if (isLocalFallback) {
      return this.readLocalMemories().length;
    }

    try {
      const { count, error } = await supabase
        .from('user_memories')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('VectorService: Failed to count memories', err);
      return 0;
    }
  }

  static async saveMemory(memory: Omit<UserMemory, 'id' | 'embedding' | 'created_at'>): Promise<UserMemory> {
    let embedding: number[] = [];

    try {
      embedding = await LLMService.generateEmbedding(memory.profile_text);
    } catch (err) {
      console.error('VectorService: Embedding generation failed during saveMemory', err);

      if (!isLocalFallback) {
        throw err;
      }

      embedding = [];
    }

    const fullMemory: UserMemory = {
      ...memory,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      embedding,
      created_at: new Date().toISOString()
    };

    if (isLocalFallback) {
      const memories = this.readLocalMemories();
      memories.push(fullMemory);
      this.writeLocalMemories(memories);
      return fullMemory;
    }

    const { data, error } = await supabase
      .from('user_memories')
      .insert(fullMemory)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async searchSimilarMemories(
    profileQueryText: string,
    limit = 5,
    matchThreshold = 0.6
  ): Promise<(UserMemory & { similarity: number })[]> {
    try {
      const queryEmbedding = await LLMService.generateEmbedding(profileQueryText);

      if (isLocalFallback) {
        const memories = this.readLocalMemories();

        return memories
          .map((mem) => {
            const similarity =
              mem.embedding && mem.embedding.length > 0
                ? calculateCosineSimilarity(queryEmbedding, mem.embedding)
                : 0;

            return { ...mem, similarity };
          })
          .filter((r) => r.similarity >= matchThreshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
      }

      const { data, error } = await supabase.rpc('match_user_memories', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: limit
      });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('VectorService: Search failed. Returning empty matches.', err);
      return [];
    }
  }

  private static async seedMemories() {
    const seedData: Omit<UserMemory, 'id' | 'embedding' | 'created_at'>[] = [
      {
        user_id: 'seed-operator-101',
        mission_name: 'Shopify Dropshipping Indian Market',
        locked_path: 'alpha',
        profile_text:
          'Goal: Ecom Dropshipping | Capital: INR 15k | Runway: 30 days | Geography: Tier 3 | Skills: Marketing, basic video editing | Mindset: Urgent need for cash flow.',
        outcome_summary:
          'Success. User bypassed paid ads, generated custom TikTok/Instagram reels for a localized trending gadget, and closed INR 60k revenue in 25 days. Margin 40%.',
        success_rate: 85
      },
      {
        user_id: 'seed-operator-102',
        mission_name: 'No-Code Automation Agency (Kanpur Locals)',
        locked_path: 'beta',
        profile_text:
          'Goal: B2B No-Code Agency | Capital: INR 8k | Runway: 45 days | Geography: Tier 2 | Skills: Make.com, Airtable, Sales pitching | Mindset: Highly analytical, low risk tolerance.',
        outcome_summary:
          'Partial Success. Locked Beta. Pitched 12 local manufacturing firms on automating inventory sheets. Signed 2 clients at INR 15k/month retainer. Day 40 consistency remained at 92%.',
        success_rate: 75
      },
      {
        user_id: 'seed-operator-103',
        mission_name: 'Next.js Micro-SaaS for Resume Parsing',
        locked_path: 'alpha',
        profile_text:
          'Goal: Micro-SaaS | Capital: INR 20k | Runway: 90 days | Geography: Tier 1 | Skills: Next.js, Node.js, AI APIs | Mindset: Technical builder prone to planning loops and over-engineering.',
        outcome_summary:
          'Failure. Spent 70 days coding without any cold outreach. Runway depleted with $0 revenue. Consistency dropped to 15% due to isolation and lack of market feedback.',
        success_rate: 15
      },
      {
        user_id: 'seed-operator-104',
        mission_name: 'YouTube Video Editing Freelancing',
        locked_path: 'alpha',
        profile_text:
          'Goal: Video Editing Agency | Capital: INR 3k | Runway: 15 days | Geography: Tier 2 | Skills: Premiere Pro, English writing | Mindset: High anxiety, immediate financial pressure.',
        outcome_summary:
          'Success. Sent 40 personalized video audit pitches on Twitter/X to tech creators daily. Closed 3 creators at INR 10k/month each. Day 10 velocity hit first revenue.',
        success_rate: 90
      }
    ];

    if (isLocalFallback) {
      const existing = this.readLocalMemories();
      if (existing.length > 0) return;

      const seeded: UserMemory[] = seedData.map((seed, index) => ({
        ...seed,
        id: `seed-mem-local-${index + 1}`,
        embedding: [] as number[],
        created_at: new Date().toISOString()
      }));

      this.writeLocalMemories([...existing, ...seeded]);
      console.log('VectorService: Local seeding completed.');
      return;
    }

    for (const seed of seedData) {
      try {
        const embedding = await LLMService.generateEmbedding(seed.profile_text);

        const fullMemory: UserMemory = {
          ...seed,
          id: `seed-mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          embedding,
          created_at: new Date().toISOString()
        };

        await supabase.from('user_memories').insert(fullMemory);
      } catch (err) {
        console.error('VectorService: Failed to seed memory', err);
      }
    }

    console.log('VectorService: Seeding completed.');
  }
}
