import { createEngine } from "./engine/executor";
import { dispatchTask } from "./engine/dispatcher";

async function main() {
  console.log("🚀 Booting Rachel 10 Engine...\n");
  const ctx = createEngine();
  
  // Test 1: Simple task (Should answer directly)
  const res1 = await dispatchTask("What is the capital of France?", ctx);
  console.log(`\n🤖 Response 1: ${res1}\n`);
  
  // Test 2: Complex task (Should see that tool_web_search already exists and reuse it in a new plan)
  const res2 = await dispatchTask("Find the top 3 news articles about Microsoft.", ctx);
  console.log(`\n🤖 Response 2:`, res2);
}

main().catch(console.error);
