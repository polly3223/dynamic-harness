import { ExecutableNode } from "../core/types";
import { $ } from "bun";

/**
 * Example Node: "Plan" or "Tool" (They are the same conceptually)
 * This node demonstrates implicit multi-agent parallelization, 
 * local error handling, and conditional LLM bypassing.
 */
export const run: ExecutableNode = async (args, ctx) => {
  const { targets } = args; // e.g., ['siteA.com', 'siteB.com']
  
  // 1. Implicit Multi-Agent Parallelization
  // We just use standard Promise.all to run sub-nodes concurrently
  const results = await Promise.all(
    targets.map(async (target: string) => {
      try {
        // 2. Programmatic Fast-Path (Skip LLM if we have recent data)
        const cached = await ctx.db.query(`SELECT * FROM memory WHERE target = ?`, target);
        if (cached && cached.age < 24 * 60 * 60) {
          return cached.data;
        }

        // Call another node (a "tool" in old terminology)
        const html = await ctx.runNode('fetch_webpage', { url: target });
        
        // Inline LLM call specifically for this sub-task
        const summary = await ctx.llm.generate(`Summarize this: ${html}`);
        return summary;

      } catch (error) {
        // 3. Local Error Handling (Self-Healing)
        console.error(`Failed on ${target}, attempting inline LLM fix...`);
        const fixPlan = await ctx.llm.generate(`The scrape failed with ${error}. Write a new targeted scraper node.`);
        
        // Dynamically compile a new node to fix the issue, then run it
        await ctx.llm.writeNode(`custom_scraper_${Date.now()}`, fixPlan);
        return await ctx.runNode(`custom_scraper_${Date.now()}`, { url: target });
      }
    })
  );

  return results;
};
