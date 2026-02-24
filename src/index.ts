import { createEngine } from "./engine/executor";

async function main() {
  console.log("🚀 Booting Rachel 10 Engine...\n");
  const runNode = createEngine();
  
  console.log("--- Executing the Bootstrapper Node ---");
  // We'll run a node that tests if the LLM can write a new tool and instantly use it!
  const result = await runNode('bootstrapper', {});
  console.log(`\n🎉 Final Result:`, result);
}

main().catch(console.error);
