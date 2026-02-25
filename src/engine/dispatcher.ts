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
2. You must build HIGHLY COMPOSABLE systems. Do not write monolithic plans. Break tasks down into reusable tools (e.g., 'tool_rss_fetcher', 'tool_summarizer').
3. If a required capability is MISSING from the 'Existing nodes' list, define it in the 'nodesToCompile' array. The system will compile all these tools in parallel BEFORE writing the main plan.
4. If an existing node EXACTLY matches a sub-task, reuse it! Do not re-compile it.

Return a strictly valid JSON object. Escape newlines with \\n.
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "nodesToCompile": [
        {
            "name": "tool_name",
            "instructions": "Specific prompt for the compiler on how to write this modular tool."
        }
    ],
    "newPlanName": "Suggested name (e.g., 'plan_research_x') if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the main plan. It should simply orchestrate the tools using ctx.runNode()."
}`;

    const response = await ctx.llm.generate(prompt);
    
    let decision;
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        decision = new Function(`return ${jsonMatch[0]}`)();
    } catch (e) {
        console.error("Failed to parse Dispatcher response as JSON. Raw response:\n", response);
        throw new Error("Dispatcher failed to return valid JSON.");
    }
    
    if (decision.action === 'DIRECT_ANSWER') {
        console.log(`[Dispatcher] Choosing to answer directly.`);
        return decision.answer;
    } 
    
    if (decision.action === 'REUSE_PLAN') {
        console.log(`[Dispatcher] Reusing existing plan: ${decision.nodeToRun}`);
        return await ctx.runNode(decision.nodeToRun, { originalTask: task });
    }
    
    if (decision.action === 'COMPILE_NEW_PLAN') {
        console.log(`[Dispatcher] Architecting new system: ${decision.newPlanName}`);
        
        // AOT (Ahead-of-Time) Compilation of dependencies in parallel!
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
        2. You MUST rely on sub-nodes for the actual work. Call them using \`ctx.runNode("tool_name", args)\`.
        3. Parallelize sub-tasks heavily using Promise.allSettled.
        4. ALWAYS use \`await ctx.memory.write("filename.json", data)\` to save the final results.
        5. DO NOT use ctx.llm.writeNode inside this plan. Assume all required tools have already been compiled and exist.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
