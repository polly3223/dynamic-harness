/**
 * LLM Compiler Interface via OpenRouter
 */
import { join } from "path";

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set.");
  }

  // Use Qwen3 Coder Next as the core compiler
  const model = "qwen/qwen3-coder-next";
  
  const payload = {
    model: model,
    messages: [
      { role: "user", content: prompt }
    ]
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  try {
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Failed to parse OpenRouter response:", JSON.stringify(data, null, 2));
    throw new Error("Invalid response format from OpenRouter");
  }
}

export async function writeNode(name: string, prompt: string): Promise<void> {
  const sysPrompt = `You are the core compiler for the dynamic-harness polymorphic agent engine.
Your task is to write an ExecutableNode in TypeScript that fulfills the user's request.

RULES:
1. You MUST export a 'run' function matching this signature:
   import { ExecutableNode } from "../core/types";
   export const run: ExecutableNode = async (args, ctx) => { ... }
2. You can import { $ } from "bun" to run shell commands if needed.
3. You have access to ctx.memory, ctx.llm, and ctx.runNode.
4. Return ONLY valid, raw TypeScript code. Do NOT wrap it in markdown formatting (no \`\`\`typescript). Just the code.`;

  const fullPrompt = `${sysPrompt}\n\nTask: ${prompt}`;
  console.log(`[Compiler] Thinking and writing node: ${name}.ts...`);
  
  let code = await generateContent(fullPrompt);
  
  // Clean up any markdown blocks if the LLM disobeys the prompt
  code = code.replace(/^```(?:typescript|ts)?\n/mi, '');
  code = code.replace(/```$/m, '');
  code = code.trim();

  const fullPath = join(import.meta.dir, "..", "nodes", `${name}.ts`);
  await Bun.write(fullPath, code);
  console.log(`[Compiler] Successfully wrote executable node to ${name}.ts`);
}
