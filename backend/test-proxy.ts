import { executeWithRotation } from './src/services/llm.service';

async function run() {
  try {
    console.log("Starting rapid requests to trigger 429...");
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        executeWithRotation({
          contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
        })
      );
    }
    await Promise.all(promises);
    console.log("All finished");
  } catch (err: any) {
    console.log("Caught in run:", err.message);
  }
}
run();
