import { LLMService } from './src/services/llm.service';
import { buildFullSystemPrompt } from './src/engine/index';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually to load credentials
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        process.env[key] = value;
      }
    }
  }
} catch (e) {
  console.error("Failed to load .env manually:", e);
}

if (process.env.AI_PROVIDER_KEY && !process.env.GEMINI_KEYS) {
  process.env.GEMINI_KEYS = process.env.AI_PROVIDER_KEY;
}

async function main() {
  console.log("Starting test call with Gemini API...");
  console.log("Using API Key:", process.env.AI_PROVIDER_KEY ? "MAPPED (AQ.Ab8...)" : "MISSING");
  
  const prompt = buildFullSystemPrompt('onboarding', {});
  const history = [
    { role: 'user' as const, parts: [{ text: "hi" }] }
  ];
  
  try {
    const response = await LLMService.generateValidatedResponse(
      "test-user",
      prompt,
      history,
      []
    );
    console.log("\n-----------------------------------------");
    console.log("AI Response:", response.response_text);
    console.log("-----------------------------------------\n");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main();
