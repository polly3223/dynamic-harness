import { createEngine } from "./engine/executor";

async function main() {
  console.log("🚀 Booting Rachel 10 Engine...\n");
  
  // Initialize the engine
  const runNode = createEngine();
  
  // Run our root node
  console.log("--- First Execution ---");
  await runNode('hello_world', { name: "Creator" });
  
  console.log("\n--- Second Execution (Testing Memory) ---");
  const result = await runNode('hello_world', { name: "Creator" });
  
  console.log(`\nFinal Result: ${result}`);
}

main().catch(console.error);
