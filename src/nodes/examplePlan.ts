import { ExecutableNode } from "../core/types";

/**
 * Example Node: "Plan" or "Tool" (They are the same conceptually)
 */
export const run: ExecutableNode = async (args, ctx) => {
  const { targets } = args; // e.g., ['siteA.com', 'siteB.com']
  
  // 1. Implicit Multi-Agent Parallelization
  const results = await Promise.all(
    targets.map(async (target: string) => {
      try {
        // 2. Programmatic Fast-Path (Hierarchical File-System Memory)
        // Check if we already have fresh data in the memory directory
        const safeName = target.replace(/[^a-z0-9]/gi, '_');
        const cached = await ctx.memory.read<{ timestamp: number, summary: string }>(`competitors/${safeName}.json`);
        
        if (cached && (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000)) {
          return cached.summary; // Bypass LLM entirely!
        }

        // Call another node to do the actual scraping
        const html = await ctx.runNode('fetch_webpage', { url: target });
        
        // Inline LLM call specifically for this sub-task
        const summary = await ctx.llm.generate(`Summarize this competitor data: ${html}`);
        
        // Save back to memory dir
        await ctx.memory.write(`competitors/${safeName}.json`, { timestamp: Date.now(), summary });
        return summary;

      } catch (error) {
        // 3. Local Error Handling (Delegation)
        // Instead of hardcoding the LLM to rewrite a scraper here, we delegate 
        // the error to a specialized "Healer" node. This keeps our plan clean.
        // The healer node will analyze the error and decide if it needs to write a new tool.
        console.error(`Failed on ${target}, delegating to healer node...`);
        return await ctx.runNode('error_healer', { 
          failedTarget: target, 
          error: String(error) 
        });
      }
    })
  );

  return results;
};
