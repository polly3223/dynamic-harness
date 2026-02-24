import { ExecutableNode } from "../core/types";

export const run: ExecutableNode = async (args, ctx) => {
  console.log("[Bootstrapper] I am alive! Testing the compiler...");
  
  // 1. Ask the LLM to write a brand new node that uses Bun's shell ($)
  await ctx.llm.writeNode(
    "system_info", 
    "Write a node that uses Bun's $ shell to run `uname -a` and `uptime`, and returns an object with both strings."
  );

  // 2. Immediately execute the newly compiled node!
  console.log("[Bootstrapper] Executing the newly created 'system_info' node...");
  const info = await ctx.runNode("system_info", {});
  
  return info;
};
