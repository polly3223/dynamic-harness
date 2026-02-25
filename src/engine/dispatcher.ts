import type { NodeContext } from "../core/types";

export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Dispatcher for a polymorphic agent. 
The user wants: "${task}"

Existing executable nodes: [ ${existingNodes.join(', ')} ]

Decide the best course of action. Return JSON exactly like this:
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "newPlanName": "Suggested name (e.g., 'plan_research_x') if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the compiler if COMPILE_NEW_PLAN, else null"
}`;

    const response = await ctx.llm.generate(prompt);
    const cleanJson = response.replace(/^```json/mi, '').replace(/```$/m, '').trim();
    const decision = JSON.parse(cleanJson);
    
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
        
        const compilerPrompt = `Write an orchestrator plan to achieve this: ${decision.newPlanInstructions}
        
        CRITICAL RULES FOR ORCHESTRATION:
        1. Existing nodes you can use via ctx.runNode(): [ ${existingNodes.join(', ')} ]
        2. If a required capability doesn't exist, compile it FIRST: \`await ctx.llm.writeNode('tool_name', 'prompt')\`.
        3. ALWAYS pass string literals to runNode: \`ctx.runNode("tool_name", args)\`. NEVER pass a variable as the node name.
        4. Parallelize sub-tasks heavily using Promise.all.
        5. DO NOT silently swallow errors. If a tool fails, let it throw.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
