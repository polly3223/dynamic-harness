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
  const sysPrompt = `You are the compiler for the 'dynamic-harness' polymorphic agent.
Your task is to write an ExecutableNode in TypeScript.

CRITICAL ARCHITECTURE CONCEPTS:
1. NODES ARE COMPOSABLE: A "Plan" is an Orchestrator Node that calls other Nodes.
2. DYNAMIC COMPILATION: Use \`await ctx.llm.writeNode('tool_name', 'Instructions...')\` to create missing tools.
3. PARALLEL EXECUTION: Use \`Promise.all()\` for parallel tasks.

STRICT API RULES (DO NOT INVENT METHODS):
- Required Import: \`import type { ExecutableNode } from "../core/types";\`
- Export Signature: \`export const run: ExecutableNode = async (args, ctx) => { ... }\`
- Check Available Nodes: \`const nodes = await ctx.getAvailableNodes();\` (NEVER use ctx.llm.listNodes)
- Call Sub-Nodes: \`await ctx.runNode(name, args)\`
- Shell Execution: \`import { $ } from "bun";\` -> \`await $\`ls -la\`\` (MUST use tagged template literals)
- Memory Write: \`await ctx.memory.write("path/to/file.json", data)\`
- Memory Read: \`await ctx.memory.read("path/to/file.json")\`

Output ONLY raw TypeScript code. No markdown formatting. No explanations.`;

  const fullPrompt = `${sysPrompt}\n\nTask: ${prompt}`;
  console.log(`[Compiler] Thinking and writing node: ${name}.ts...`);
  
  let code = await generateContent(fullPrompt);
  code = code.replace(/^```(?:typescript|ts)?\n/mi, '').replace(/```$/m, '').trim();

  const fullPath = join(import.meta.dir, "..", "nodes", `${name}.ts`);
  await Bun.write(fullPath, code);
  console.log(`[Compiler] Successfully wrote node to ${name}.ts`);
}
