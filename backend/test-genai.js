require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const keys = process.env.GEMINI_KEYS ? process.env.GEMINI_KEYS.split(',') : (process.env.GEMINI_API_KEY ? [process.env.GEMINI_API_KEY] : []);
const ai = new GoogleGenAI({ apiKey: keys[0] });
async function run() {
  const responseStream = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: 'tell me a joke'
  });
  for await (const chunk of responseStream) {
    console.log('Chunk text:', chunk.text);
    console.log('Chunk keys:', Object.keys(chunk));
  }
}
run().catch(console.error);
