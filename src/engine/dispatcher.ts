import { NodeContext } from "../core/types";

/**
 * The Dispatcher is the fast, stateless LLM layer that sits at the front.
 * It decides whether to answer directly, reuse an existing plan, or compile a new one.
 */
export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    // 1. Give the LLM awareness of all existing nodes (tools/plans)
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Rachel10 Dispatcher. The user wants you to: "${task}"

Here are the names of all currently existing nodes in the system:
[ ${existingNodes.join(', ')} ]

Decide the best course of action. Return a JSON object in exactly this format:
{
    "action": "DIRECT_ANSWER" | "REUSE_PLAN" | "COMPILE_NEW_PLAN",
    "answer": "String answer if DIRECT_ANSWER, else null",
    "nodeToRun": "Name of the node to run if REUSE_PLAN, else null",
    "newPlanName": "Suggested name (e.g., 'plan_do_x') if COMPILE_NEW_PLAN, else null",
    "newPlanInstructions": "Detailed prompt for the compiler if COMPILE_NEW_PLAN, else null"
}`;

    const response = await ctx.llm.generate(prompt);
    
    // Clean JSON response (LLMs sometimes wrap in ```json)
    const cleanJson = response.replace(/^```json/mi, '').replace(/```$/m, '').trim();
    const decision = JSON.parse(cleanJson);
    
    // 2. Execute the decision!
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
        
        // Instruct the compiler to use existing tools if applicable
        const compilerPrompt = `${decision.newPlanInstructions}
        
        CRITICAL: Before writing any new tools, check this list of existing nodes:
        [ ${existingNodes.join(', ')} ]
        If a tool like 'tool_web_search' or 'tool_web_fetch' already exists, DO NOT write it again. Just import it and use it via ctx.runNode()!`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
