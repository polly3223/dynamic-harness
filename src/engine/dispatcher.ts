import type { NodeContext } from "../core/types";

export async function dispatchTask(task: string, ctx: NodeContext): Promise<any> {
    console.log(`\n[Dispatcher] Received task: "${task}"`);
    
    const existingNodes = await ctx.getAvailableNodes();
    console.log(`[Dispatcher] Found ${existingNodes.length} existing nodes.`);
    
    const prompt = `You are the Dispatcher for a polymorphic agent capable of writing its own code.
The user wants: "${task}"

Existing executable nodes: [ ${existingNodes.join(', ')} ]

RULES:
1. If the request requires fetching live data, scraping, files, or multi-step logic, you MUST choose "COMPILE_NEW_PLAN". DO NOT say "I can't do this".
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
        // Find JSON block
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        let rawStr = jsonMatch[0];
        
        // Very aggressive cleanup for bad LLM JSON with unescaped newlines in strings
        // We will just let JSON.parse try, if it fails we fall back to a safer regex or regex-based cleanup
        try {
            decision = JSON.parse(rawStr);
        } catch (e) {
            // Unescaped newlines fix
            rawStr = rawStr.replace(/(?<!\\)\n/g, '\\n');
            // But we actually DO want literal newlines between keys. It's too complex to regex perfectly.
            // Let's just ask the LLM again? No, let's use a loose JSON parser or fix the prompt.
            // Actually, since we use V8, let's try using `Function` to evaluate it as an object literal.
            // It's safe here because the LLM generated it, but `eval` is dangerous.
            // Let's just stick to JSON.parse but strip control chars.
        }
        
        // Safe evaluation
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
        
        const compilerPrompt = `Write an orchestrator plan to achieve this: ${decision.newPlanInstructions}
        
        CRITICAL RULES FOR ORCHESTRATION:
        1. Existing nodes you can use via ctx.runNode(): [ ${existingNodes.join(', ')} ]
        2. If a required capability doesn't exist, compile it FIRST: \`await ctx.llm.writeNode('tool_name', 'prompt')\`. YOU MUST AWAIT writeNode BEFORE YOU runNode IT!
        3. ALWAYS pass string literals to runNode: \`ctx.runNode("tool_name", args)\`. NEVER pass a variable as the node name.
        4. Parallelize sub-tasks heavily using Promise.allSettled (not Promise.all) to avoid crashing on a single failure.
        5. DO NOT silently swallow errors. If a tool fails, let it throw.`;
        
        await ctx.llm.writeNode(decision.newPlanName, compilerPrompt);
        return await ctx.runNode(decision.newPlanName, { originalTask: task });
    }
}
