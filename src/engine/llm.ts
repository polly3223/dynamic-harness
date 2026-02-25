import { join } from "path";

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set.");

  // Respect user model choice
  const model = process.env.OPENROUTER_MODEL || "qwen/qwen3-coder-next";
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
  const sysPrompt = `You are the compiler for a polymorphic TS agent. 
Your ONLY job is to write an ExecutableNode in TypeScript.
YOU MUST NEVER WRITE PYTHON. NO PYTHON. ONLY TYPESCRIPT.

CRITICAL ARCHITECTURE CONCEPTS:
1. NODES ARE COMPOSABLE: A "Plan" is an Orchestrator Node that calls other Nodes.
2. DYNAMIC COMPILATION: Use \`await ctx.llm.writeNode('tool_name', 'Instructions...')\` to create missing tools BEFORE calling them.
3. PARALLEL EXECUTION: Use \`Promise.allSettled()\` for parallel tasks.

STRICT API RULES (DO NOT INVENT METHODS):
- Required Import: \`import type { ExecutableNode } from "../core/types";\`
- Export Signature: \`export const run: ExecutableNode = async (args, ctx) => { ... }\`
- AI INTELLIGENCE (CRITICAL): You have a built-in LLM! For ANY task requiring NLP, summarization, analysis, extraction, or translation, DO NOT write manual algorithmic code. JUST USE THE AI: \`const summary = await ctx.llm.generate("Summarize: " + text);\`
- Call Sub-Nodes: \`await ctx.runNode("string_name", args)\`. The first argument MUST be a hardcoded string!
- Memory Write: \`await ctx.memory.write("filename.json", data)\`. (Do NOT use Bun.write for memory!)
- Memory Read: \`await ctx.memory.read("filename.json")\`.
- Global fetch: You run in Bun. You MUST use the global \`fetch()\` function to make HTTP requests. DO NOT invent \`ctx.llm.fetch\`.
- Web Parsing: You run in Bun (Node.js backend). There is NO \`window\`, NO \`document\`, and NO \`DOMParser\`. Use Regex to parse HTML or XML.

BEST PRACTICES FOR NEWS/WEB:
- DO NOT try to fetch() individual article URLs from Bloomberg, Reuters, Google News, etc. They have bot protection and will return 403 or empty pages.
- INSTEAD: Fetch the Google News RSS feed directly: \`https://news.google.com/rss/search?q=\${encodeURIComponent(query)}\`
- Use Regex to extract the <title> and <description> tags from the RSS feed.
- Summarize the <title> and <description> text directly! You do not need to visit the underlying article URL to write a summary.

Output ONLY raw TypeScript code. No markdown formatting (\`\`\`ts). No explanations.`;

  const fullPrompt = `${sysPrompt}\n\nTask: ${prompt}`;
  console.log(`[Compiler] Thinking and writing node: ${name}.ts...`);
  
  let code = await generateContent(fullPrompt);
  code = code.replace(/^```[a-z]*\n/mi, '').replace(/```$/m, '').trim();

  if (code.includes("import duckduckgo_search") || code.includes("def run(")) {
      throw new Error("Compiler hallucinated Python code instead of TypeScript. Triggering self-heal retry.");
  }

  const fullPath = join(import.meta.dir, "..", "nodes", `${name}.ts`);
  await Bun.write(fullPath, code);
  console.log(`[Compiler] Successfully wrote node to ${name}.ts`);
}
