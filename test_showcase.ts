import { createEngine } from "./src/engine/executor";
import { dispatchTask } from "./src/engine/dispatcher";

async function runWithRetries(initialTask: string, ctx: any, maxRetries = 2) {
  let taskToExecute = initialTask;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const response = await dispatchTask(taskToExecute, ctx);
      console.log(`\n✅ SUCCESS (Attempt ${retryCount + 1}):`);
      const resStr = JSON.stringify(response, null, 2);
      console.log(resStr ? (resStr.length > 500 ? resStr.substring(0, 500) + "... [TRUNCATED]" : resStr) : "No output returned.");
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error(`\n❌ FAILED (Attempt ${retryCount + 1}): ${errorMessage}`);
      
      if (retryCount < maxRetries) {
        console.log("   -> Triggering Self-Heal loop...");
        // FIX: Don't tell it to be "defensive". Tell it to fix the actual bug cleanly.
        taskToExecute = `The previous attempt failed with this error: ${errorMessage}. Please compile a NEW plan that fixes this exact bug. Keep the code simple and clean. Do not create unnecessary wrapper nodes.`;
        retryCount++;
      } else {
        console.error("   -> Max retries reached. Task failed permanently.");
        return false;
      }
    }
  }
}

async function run() {
  console.log("==========================================");
  console.log("🚀 RACHEL 10: POLYMORPHIC AGENT SHOWCASE");
  console.log("==========================================\n");

  try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const nodesDir = path.join(process.cwd(), "src/nodes");
      const memDir = path.join(process.cwd(), "memory");
      try {
          const nodes = await fs.readdir(nodesDir);
          for (const file of nodes) if (file.endsWith(".ts")) await fs.unlink(path.join(nodesDir, file));
      } catch (e) {}
      try {
          const memories = await fs.readdir(memDir);
          for (const file of memories) if (file !== "users") {
                const stat = await fs.stat(path.join(memDir, file));
                if (stat.isFile()) await fs.unlink(path.join(memDir, file));
          }
      } catch (e) {}
  } catch(e) {}
  
  const ctx = createEngine();

  console.log("\n[STAGE 1] The user asks for a complex task from scratch.");
  const task1 = "Find the 3 most recent news articles about Apple, fetch their summaries, and save them to memory.";
  console.log(`Task: "${task1}"`);
  
  await runWithRetries(task1, ctx);

  const nodesAfterTask1 = await ctx.getAvailableNodes();
  console.log("\n[INFRASTRUCTURE BUILT] Look what the agent left behind on disk:");
  nodesAfterTask1.forEach((node: string) => console.log(`  - src/nodes/${node}.ts`));

  console.log("\n------------------------------------------");
  console.log("[STAGE 2] The user asks for a DIFFERENT task that requires similar capabilities.");
  const task2 = "I need a report on Microsoft. Find 3 articles and summarize them to memory.";
  console.log(`Task: "${task2}"`);
  
  await runWithRetries(task2, ctx);

  console.log("\n==========================================");
  console.log("SHOWCASE COMPLETE.");
  console.log("Notice how Stage 2 was infinitely faster because the Dispatcher");
  console.log("reused the tools compiled in Stage 1 instead of writing them from scratch!");
  console.log("==========================================\n");
}

run();
