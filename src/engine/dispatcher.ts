import type { NodeContext } from "../core/types";

export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Dispatcher for a polymorphic TypeScript runtime engine.
The user wants: "${task}"

Existing TS executable nodes: [ ${existingNodes.join(', ')} ]

RULES:
1. If the request requires fetching live data, scraping, files, or multi-step logic, choose "COMPILE_NEW_PLAN".
2. If it's just a simple greeting ("hi") or basic fact ("what is 2+2"), use "DIRECT_ANSWER".
3. If an existing node EXACTLY matches the request, use "REUSE_PLAN".

Return a strictly valid JSON object. DO NOT include raw newlines inside the string fields. Escape them with \\n.
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "newPlanName": "Suggested name (e.g., 'plan_research_x') if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the compiler if COMPILE_NEW_PLAN, else null"
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
        console.log(`[Dispatcher] Compiling new plan: ${decision.newPlanName}`);
        
        const compilerPrompt = `Write a TypeScript orchestrator plan to achieve this: ${decision.newPlanInstructions}
        
        CRITICAL RULES FOR ORCHESTRATION:
        1. YOU MUST WRITE TYPESCRIPT. NO PYTHON.
        2. Existing nodes you can use via ctx.runNode(): [ ${existingNodes.join(', ')} ]
        3. If a required capability doesn't exist, compile it FIRST: \`await ctx.llm.writeNode('tool_name', 'instructions')\`. YOU MUST AWAIT writeNode BEFORE YOU runNode IT!
        4. AI USAGE: For text analysis/summarization, tell the compiler to explicitly use \`await ctx.llm.generate("Summarize: " + text)\` instead of writing manual NLP algorithms!
        5. ALWAYS use \`await ctx.memory.write("filename.json", data)\` to save the final results to the memory folder.
        6. Parallelize sub-tasks heavily using Promise.allSettled.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
