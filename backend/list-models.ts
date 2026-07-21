import { GoogleGenAI } from '@google/genai';

async function list() {
  import 'dotenv/config';
  const apiKey = process.env.GEMINI_KEYS?.split(',')[0] || '';
  const client = new GoogleGenAI({ apiKey });
  try {
    const models = await client.models.list();
    for await (const m of models) {
      console.log(m.name);
    }
  } catch (e: any) {
    console.error("List failed:", e.message);
  }
}
list();
