require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  const keys = (process.env.GEMINI_API_KEY || process.env.AI_PROVIDER_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  console.log("Keys found:", keys.length);
  if (!keys.length) return console.error("No keys!");
  
  const client = new GoogleGenAI({ apiKey: keys[0] });

  try {
    const responseStream = await client.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: "hi i want to quit yaar mujh se nhi hoga" }] }],
      config: {
        maxOutputTokens: 8192,
        temperature: 0.85,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      }
    });

    for await (const chunk of responseStream) {
      process.stdout.write(chunk.text || '');
      const finishReason = chunk.candidates?.[0]?.finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.log("\n[PREMATURE STOP]:", finishReason);
      }
    }
    console.log("\n[DONE]");
  } catch (e) {
    console.error("\n[ERROR]", e);
  }
}
test();
