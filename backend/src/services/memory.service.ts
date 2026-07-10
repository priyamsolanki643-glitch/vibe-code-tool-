import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '' });

const dbPath = path.join(process.cwd(), 'database.json');

function readDb() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  } catch (e) {
    return { user_memories: [] };
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing memory to db:', e);
  }
}

export interface Memory {
  text: string;
  vector: number[];
  timestamp: number;
}

export class MemoryService {
  /**
   * Generates a 768-dimensional embedding for a given text.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await genai.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });
      return response.embeddings?.[0]?.values || [];
    } catch (error) {
      console.error('[MemoryService] Failed to generate embedding:', error);
      return [];
    }
  }

  /**
   * Computes the cosine similarity between two vectors.
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Saves a new memory for a user.
   */
  static async saveMemory(userId: string, text: string): Promise<void> {
    const vector = await this.generateEmbedding(text);
    if (vector.length === 0) return;

    const data = readDb();
    if (!data.user_memories) data.user_memories = [];
    
    data.user_memories.push({
      user_id: userId,
      text,
      vector,
      timestamp: Date.now()
    });

    writeDb(data);
  }

  /**
   * Searches for the top K most relevant past memories for a given query.
   */
  static async searchMemories(userId: string, query: string, topK: number = 3): Promise<string[]> {
    const data = readDb();
    const userMemories = (data.user_memories || []).filter((m: any) => m.user_id === userId);
    
    if (userMemories.length === 0) return [];

    const queryVector = await this.generateEmbedding(query);
    if (queryVector.length === 0) return [];

    const scoredMemories = userMemories.map((m: any) => ({
      text: m.text,
      score: this.cosineSimilarity(queryVector, m.vector)
    }));

    // Sort by descending score
    scoredMemories.sort((a: any, b: any) => b.score - a.score);

    // Return the top K relevant memories (filter low similarity < 0.6)
    return scoredMemories
      .filter((m: any) => m.score > 0.6)
      .slice(0, topK)
      .map((m: any) => m.text);
  }
}
