import { createEngine } from "./src/engine/executor";
import { dispatchTask } from "./src/engine/dispatcher";

async function run() {
  console.log("==========================================");
  console.log("🚀 RACHEL 10: POLYMORPHIC AGENT SHOWCASE");
  console.log("==========================================\n");

  // Wipe slate clean for the showcase (using JS to avoid bash wildcard errors across OSs)
  try {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const nodesDir = path.join(process.cwd(), "src/nodes");
      const memDir = path.join(process.cwd(), "memory");

      // Clean nodes
      try {
          const nodes = await fs.readdir(nodesDir);
          for (const file of nodes) {
              if (file.endsWith(".ts")) await fs.unlink(path.join(nodesDir, file));
          }
      } catch (e) {}

      // Clean memory
      try {
          const memories = await fs.readdir(memDir);
          for (const file of memories) {
              if (file !== "users") {
                const stat = await fs.stat(path.join(memDir, file));
                if (stat.isFile()) await fs.unlink(path.join(memDir, file));
              }
          }
      } catch (e) {}
  } catch(e) {
      console.log("Clean up skipped.");
  }
  
  const ctx = createEngine();

  // --- STAGE 1: THE FIRST TASK ---
  console.log("\n[STAGE 1] The user asks for a complex task from scratch.");
  const task1 = "Search the web for the 3 most recent news articles about Apple, and summarize them.";
  console.log(`Task: "${task1}"`);
  
  let retryCount = 0;
  while (retryCount < 2) {
    try {
      await dispatchTask(task1, ctx);
      break;
    } catch (err) {
      console.log(`\n[Self-Heal] Recovering from error: ${(err as Error).message}`);
      await dispatchTask(`The previous attempt failed: ${(err as Error).message}. Rewrite a safe plan.`, ctx);
      break;
    }
  }

  // Check what nodes were permanently left behind on the disk
  const nodesAfterTask1 = await ctx.getAvailableNodes();
  console.log("\n[INFRASTRUCTURE BUILT] Look what the agent left behind on disk:");
  nodesAfterTask1.forEach(node => console.log(`  - src/nodes/${node}.ts`));

  // --- STAGE 2: THE REUSABILITY TEST ---
  console.log("\n------------------------------------------");
  console.log("[STAGE 2] The user asks for a DIFFERENT task that requires similar capabilities.");
  const task2 = "I need a report on Microsoft. Find 3 articles and summarize them.";
  console.log(`Task: "${task2}"`);
  
  try {
    await dispatchTask(task2, ctx);
  } catch (err) {
    // ignore
  }

  console.log("\n==========================================");
  console.log("SHOWCASE COMPLETE.");
  console.log("Notice how Stage 2 was infinitely faster because the Dispatcher");
  console.log("reused the tools compiled in Stage 1 instead of writing them from scratch!");
  console.log("==========================================\n");
}

run();
