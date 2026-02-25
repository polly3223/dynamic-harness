import { join } from "path";

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set.");

  const model = "qwen/qwen3-coder-next";
  const payload = { model, messages: [{ role: "user", content: prompt }] };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`OpenRouter API Error: ${response.status}`);
  const data = await response.json() as any;
  return data.choices[0].message.content;
}

export async function writeNode(name: string, prompt: string): Promise<void> {
  const sysPrompt = `You are the core compiler for the dynamic-harness polymorphic agent engine.
Your task is to write an ExecutableNode in TypeScript that fulfills the user's request.

CRITICAL RULES AND API SIGNATURES:
1. Export 'run': \`export const run: ExecutableNode = async (args, ctx) => { ... }\`
2. You have access to the file system via Bun: \`import { $ } from "bun"\`
   IMPORTANT SHELL RULE: You MUST use the '$' as a tagged template literal!
   CORRECT: \`await $\`ls -la\`\`
   WRONG: \`await $("ls -la")\`
3. Memory API (Strictly use these, DO NOT invent methods like .set or .get):
   - \`await ctx.memory.read<T>(path: string): Promise<T | null>\`
   - \`await ctx.memory.write<T>(path: string, data: T): Promise<void>\`
   - \`await ctx.memory.list(dir: string): Promise<string[]>\`
4. Node execution: \`await ctx.runNode<Args, Return>(name, args)\`
5. LLM usage: \`await ctx.llm.generate(prompt)\`
6. Output MUST be pure raw TypeScript code. No markdown formatting.`;

  const fullPrompt = `${sysPrompt}\n\nTask: ${prompt}`;
  console.log(`[Compiler] Thinking and writing node: ${name}.ts...`);
  
  let code = await generateContent(fullPrompt);
  code = code.replace(/^```(?:typescript|ts)?\n/mi, '').replace(/```$/m, '').trim();

  const fullPath = join(import.meta.dir, "..", "nodes", `${name}.ts`);
  await Bun.write(fullPath, code);
  console.log(`[Compiler] Successfully wrote node to ${name}.ts`);
}
