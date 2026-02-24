import { ExecutableNode } from "../core/types";

export const run: ExecutableNode = async (args, ctx) => {
  console.log("[Bootstrapper] I am alive! Testing the compiler...");
  
  // 1. Ask the LLM to write a brand new node that uses Bun's shell ($)
  await ctx.llm.writeNode(
    "system_info", 
    "Write a node that uses Bun's $ shell to run `uname -a` and `date`, and returns an object with both strings."
  );

  // 2. Immediately execute the newly compiled node!
  console.log("[Bootstrapper] Executing the newly created 'system_info' node...");
  
  try {
    const info = await ctx.runNode("system_info", {});
    return info;
  } catch (error) {
    console.error("[Bootstrapper] Caught error locally! Self-healing...");
    
    // Demonstrate Self-Healing!
    await ctx.llm.writeNode(
      "system_info",
      `The previous code threw an error: ${error}. Please rewrite the node to safely return the uname and date using Bun. Keep it simple.`
    );
    
    // Run the newly healed node
    return await ctx.runNode("system_info", {});
  }
};
