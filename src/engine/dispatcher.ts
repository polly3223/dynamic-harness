import type { NodeContext } from "../core/types";

export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Architect and Dispatcher for a polymorphic TypeScript runtime engine.
The user wants: "${task}"

Existing TS executable nodes: [ ${existingNodes.join(', ')} ]

RULES FOR ARCHITECTING:
1. If the request requires live data, scraping, or multi-step logic, choose "COMPILE_NEW_PLAN".
2. **GENERIC TOOLS ONLY:** Tools MUST be entirely generic and reusable. NEVER name a tool after a specific subject. 
   - BAD: "tool_search_apple_news", "tool_microsoft_summarizer"
   - GOOD: "tool_search_news", "tool_summarize_article"
   You must pass the specific subjects (e.g., "Apple") as \`args\` inside the plan.
3. If a REQUIRED GENERIC TOOL is MISSING, define it in the 'nodesToCompile' array.
4. If an existing generic node already does what you need, REUSE IT! Do not compile a new one.

Return a strictly valid JSON object. Escape newlines with \\n.
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "nodesToCompile": [
        {
            "name": "generic_tool_name",
            "instructions": "Specific prompt for the compiler on how to write this modular tool. Remind it to accept generic args."
        }
    ],
    "newPlanName": "Suggested name (e.g., 'plan_research_x') if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the main plan. It should orchestrate the tools using ctx.runNode('generic_tool', { query: 'specific_subject' })."
}`;

    const response = await ctx.llm.generate(prompt);
    
    let decision;
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        decision = new Function(`return ${jsonMatch[0]}`)();
    } catch (e) {
        throw new Error("Dispatcher failed to return valid JSON.");
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
        2. Pass specific arguments to the generic tools (e.g., \`ctx.runNode("tool_search_news", { query: "Apple" })\`).
        3. Parallelize sub-tasks heavily using Promise.allSettled.
        4. ALWAYS use \`await ctx.memory.write("filename.json", data)\` to save the final results.
        5. DO NOT use ctx.llm.writeNode inside this plan. Assume all required tools have already been compiled and exist.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
