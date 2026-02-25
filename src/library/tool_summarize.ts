import type { ExecutableNode } from "../core/types";

/**
 * tool_summarize
 * A stable tool to summarize text using the LLM.
 */
export const run: ExecutableNode<{ text: string, instructions?: string }, string> = async (args, context) => {
  const { text, instructions } = args;
  if (!text) throw new Error("Missing text argument");

  const prompt = `Summarize the following text. ${instructions || "Focus on the key points."}\n\nTEXT:\n${text.substring(0, 15000)}`;
  
  return await context.llm.generate(prompt);
};
