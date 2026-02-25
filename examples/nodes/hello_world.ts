import { ExecutableNode } from "../../src/core/types";

export const run: ExecutableNode = async (args, ctx) => {
  const { name } = args;
  
  // 1. Check Memory
  let visitCount = await ctx.memory.read<{ count: number }>(`users/${name}.json`);
  
  if (!visitCount) {
    console.log(`[Node:hello_world] First time seeing ${name}! Creating memory...`);
    visitCount = { count: 1 };
  } else {
    console.log(`[Node:hello_world] Welcome back ${name}! This is visit #${visitCount.count + 1}`);
    visitCount.count += 1;
  }

  // 2. Save Memory
  await ctx.memory.write(`users/${name}.json`, visitCount);

  // 3. Conditional tool delegation
  if (visitCount.count === 1) {
    // Let's pretend we delegate to an LLM to generate a custom greeting
    const greeting = await ctx.llm.generate(`Write a warm welcome for ${name}`);
    return greeting;
  }

  return `Hello again, ${name}! Memory updated successfully.`;
};
