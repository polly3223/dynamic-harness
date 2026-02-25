import { createEngine } from "./engine/executor";
import { dispatchTask } from "./engine/dispatcher";

async function main() {
  console.log("🚀 Booting Rachel 10 Engine...\n");
  const ctx = createEngine();
  
  // Test 1: Simple task (Should answer directly without writing tools)
  const res1 = await dispatchTask("What is the capital of Italy?", ctx);
  console.log(`\n🤖 Response: ${res1}\n`);
  
  console.log("---");
  
  // Test 2: Complex task (Will trigger the compiler to write a new plan and/or tools)
  const res2 = await dispatchTask("Use Bun's shell ($) to print 'Hello World' directly to the console.", ctx);
  console.log(`\n🤖 Response:`, res2);
}

main().catch(console.error);
