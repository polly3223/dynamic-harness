import type { NodeContext } from "../core/types";

export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Architect and Dispatcher for a polymorphic TypeScript runtime engine.
The user wants: "${task}"

STANDARD LIBRARY (Always Available - PREFER THESE):
- 'tool_web_search': { query: string } -> returns [{ title, link, pubDate, source }]
- 'tool_web_fetch': { url: string } -> returns raw text
- 'tool_summarize': { text: string, instructions?: string } -> returns AI summary

EXISTING DYNAMIC NODES: [ ${existingNodes.join(', ')} ]

RULES FOR ARCHITECTING:
1. PREFER THE LIBRARY: If a Library tool exists, use it instead of compiling a new one.
2. HYBRID APPROACH: You can combine Library tools and Dynamic nodes in the same plan.
3. GENERIC TOOLS ONLY: If you MUST compile a new tool, keep it entirely generic. 
4. PLAN NAMING: 'newPlanName' must be highly specific (e.g., 'plan_research_microsoft').

Return a strictly valid JSON object:
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "nodesToCompile": [
        {
            "name": "generic_tool_name",
            "instructions": "Specific prompt for the compiler."
        }
    ],
    "newPlanName": "Suggested name if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the main plan orchestrator. Remind it which Library tools and which dynamic tools to use."
}`;

    const response = await ctx.llm.generate(prompt);
    
    let decision;
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        
        let jsonStr = jsonMatch[0];
        // Clean up common LLM JSON mistakes (like unescaped newlines in strings)
        jsonStr = jsonStr.replace(/(?<!\\)\n/g, ' '); 
        
        try {
           decision = JSON.parse(jsonStr);
        } catch (e) {
           // Fallback to JS evaluation if JSON.parse fails due to loose formatting
           decision = eval(`(${jsonMatch[0]})`);
        }
    } catch (e) {
        console.error("Failed to parse Dispatcher response as JSON.\nRaw response:\n", response);
        throw new Error(`Dispatcher failed to return valid JSON. Error: ${(e as Error).message}`);
    }
    
    if (decision.action === 'DIRECT_ANSWER') {
        return decision.answer;
    } 
    
    if (decision.action === 'REUSE_PLAN') {
        console.log(`[Dispatcher] Reusing existing plan: ${decision.nodeToRun}`);
        return await ctx.runNode(decision.nodeToRun, { originalTask: task });
    }
    
    if (decision.action === 'COMPILE_NEW_PLAN') {
        console.log(`[Dispatcher] Architecting new system: ${decision.newPlanName}`);
        
        if (decision.nodesToCompile && decision.nodesToCompile.length > 0) {
            console.log(`[Dispatcher] Compiling ${decision.nodesToCompile.length} dependencies in parallel...`);
            await Promise.all(
                decision.nodesToCompile.map((node: any) => 
                    ctx.llm.writeNode(node.name, node.instructions)
                )
            );
        }

        console.log(`[Dispatcher] Compiling main orchestrator plan...`);
        const compilerPrompt = `Write the main orchestrator plan to achieve this: ${decision.newPlanInstructions}
        
        CRITICAL RULES FOR THIS PLAN:
        1. YOU MUST WRITE TYPESCRIPT. NO PYTHON.
        2. Pass specific arguments to the generic tools (e.g., \`ctx.runNode("tool_search_news", { query: "Microsoft" })\`).
        3. Parallelize sub-tasks heavily using Promise.allSettled.
        4. ALWAYS use \`await ctx.memory.write("filename.json", data)\` to save the final results.
        5. DO NOT use ctx.llm.writeNode inside this plan. Assume all required tools have already been compiled and exist.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
