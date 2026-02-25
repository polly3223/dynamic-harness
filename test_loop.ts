import { createEngine } from "./src/engine/executor";
import { dispatchTask } from "./src/engine/dispatcher";

async function run() {
  const ctx = createEngine();
  
  let taskToExecute = "find and summarize the 50 most recent news about ukraine";
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    console.log(`\n\n--- ATTEMPT ${retryCount} ---`);
    try {
      const response = await dispatchTask(taskToExecute, ctx);
      console.log("\n✅ SUCCESS:\n", JSON.stringify(response, null, 2));
      break;
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error(`\n❌ FAILED: ${errorMessage}`);
      
      if (retryCount < maxRetries) {
        taskToExecute = `The previous attempt failed with this error: ${errorMessage}. Please compile a NEW plan that avoids this error.`;
        retryCount++;
      } else {
        console.error("Max retries reached.");
        break;
      }
    }
  }
}

run();
