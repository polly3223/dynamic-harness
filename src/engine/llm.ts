/**
 * LLM Compiler Interface via Gemini 3.1 Pro Preview
 */
import { join } from "path";

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      thinkingConfig: { thinkingLevel: "MEDIUM" }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  try {
    return data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error("Failed to parse Gemini response:", JSON.stringify(data, null, 2));
    throw new Error("Invalid response format from Gemini");
  }
}

export async function writeNode(name: string, prompt: string): Promise<void> {
  const sysPrompt = `You are the core compiler for the Rachel10 polymorphic agent engine.
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
