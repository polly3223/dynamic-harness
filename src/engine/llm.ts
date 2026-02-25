import { join } from "path";

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set.");

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
Your ONLY job is to write a single ExecutableNode in TypeScript.
YOU MUST NEVER WRITE PYTHON. NO PYTHON. ONLY TYPESCRIPT.

CRITICAL ARCHITECTURE CONCEPTS:
1. GENERIC TOOLS: Tools must accept \`args\` and act dynamically. NEVER hardcode search terms like "Apple" inside a tool.
2. PURE EXECUTION: Your code should ONLY execute logic or call other nodes. DO NOT compile or write new nodes inside this code.
3. FAIL LOUDLY: If your tool is supposed to extract data but finds nothing, THROW AN ERROR. Do not silently return an empty array (unless specifically asked to). This triggers the system's self-healing loop.

STRICT API RULES (DO NOT INVENT METHODS):
- Required Import: \`import type { ExecutableNode } from "../core/types";\`
- Export Signature: \`export const run: ExecutableNode = async (args, ctx) => { ... }\`
- AI INTELLIGENCE: For NLP/summarization, JUST USE THE AI: \`const summary = await ctx.llm.generate("Summarize: " + text);\`
- Call Sub-Nodes: \`await ctx.runNode("string_name", args)\`.
- Memory Write: \`await ctx.memory.write("filename.json", data)\`. (Do NOT use Bun.write for memory!)
- Memory Read: \`await ctx.memory.read("filename.json")\`.
- Global fetch: You run in Bun. You MUST use the global \`fetch()\` function. DO NOT invent \`ctx.llm.fetch\`.

BEST PRACTICES FOR NEWS/WEB:
- DO NOT try to fetch() individual article URLs from Bloomberg/Reuters directly (bot protection).
- INSTEAD: Fetch the Google News RSS feed: \`https://news.google.com/rss/search?q=\${encodeURIComponent(args.query)}\`
- RSS Parsing Hint: Use regex \`/<item>([\\s\\S]*?)<\\/item>/g\` to get items. Then extract \`/<title>([\\s\\S]*?)<\\/title>/\` and \`/<link>([\\s\\S]*?)<\\/link>/\`. 
- Remember to strip CDATA tags \`<![CDATA[...]]>\` if they exist in the parsed XML.

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
}
