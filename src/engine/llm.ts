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
1. NODES ARE COMPOSABLE: A "Plan" is just a Node that orchestrates other Nodes. If the task is complex (e.g., "Search news, fetch articles, summarize them, save to memory"), DO NOT write a monolithic script. 
2. DYNAMIC COMPILATION: If your plan needs a sub-node (like 'web_search') that might not exist, you MUST instruct the compiler to write it on the fly: \`await ctx.llm.writeNode('web_search', 'Instructions...')\`.
3. PARALLEL EXECUTION: When processing arrays (like fetching 5 URLs or summarizing 5 texts), you MUST execute them in parallel using \`Promise.all(items.map(i => ctx.runNode(...)))\`.

STRICT API RULES:
- Export signature MUST be: \`export const run: ExecutableNode = async (args, ctx) => { ... }\`
- File System Execution: Import \`$\` from bun (\`import { $ } from "bun"\`). You MUST use tagged template literals (e.g., \`await $\`ls -la\`\`).
- Saving Files (Memory): You MUST use \`ctx.memory.write(path, data)\`. DO NOT use \`Bun.write\` or \`fs\`. The path is relative to the secure memory directory (e.g., \`await ctx.memory.write("news_summary.json", result)\`).
- Calling Sub-Nodes: \`await ctx.runNode(name, args)\`

Output ONLY raw TypeScript code. No markdown formatting. No explanations.`;

  const fullPrompt = `${sysPrompt}\n\nTask: ${prompt}`;
  console.log(`[Compiler] Thinking and writing node: ${name}.ts...`);
  
  let code = await generateContent(fullPrompt);
  code = code.replace(/^```(?:typescript|ts)?\n/mi, '').replace(/```$/m, '').trim();

  const fullPath = join(import.meta.dir, "..", "nodes", `${name}.ts`);
  await Bun.write(fullPath, code);
  console.log(`[Compiler] Successfully wrote node to ${name}.ts`);
}
