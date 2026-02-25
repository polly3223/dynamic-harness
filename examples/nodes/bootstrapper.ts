import { ExecutableNode } from "../../src/core/types";

export const run: ExecutableNode = async (args, ctx) => {
  console.log("[Bootstrapper] Testing Polymorphic Plan Execution...");
  
  // Wipe the previous broken tools to force a fresh creation
  await Bun.$`rm -f src/nodes/tool_web_search.ts src/nodes/tool_web_fetch.ts src/nodes/plan_apple_news.ts`;
  
  const userRequest = "Find the 5 most recent news articles about Apple. Then fetch their content, and summarize all of them in parallel.";
  
  await ctx.llm.writeNode(
    "plan_apple_news", 
    `You are the planner. The user wants to: ${userRequest}
    
    Since you have NO existing tools to search the web or fetch HTML, your plan MUST:
    1. Write 'tool_web_search' using ctx.llm.writeNode. 
       - It must use the DuckDuckGo html endpoint (https://html.duckduckgo.com/html/) and simple Regex to extract href links and titles. 
       - Return { results: { title: string, url: string }[] }.
    2. Write 'tool_web_fetch'.
       - It must fetch the URL, strip all HTML tags using regex, and return just the raw text content.
    3. Execute the search tool via ctx.runNode('tool_web_search', { query: 'Apple news' }).
    4. Slice the results to the top 3.
    5. Map over the results and use Promise.all to fetch the text using the fetch tool.
    6. Map over the fetched texts and use ctx.llm.generate to summarize each one.
    7. Return the final array of summaries.
    
    Write the 'plan_apple_news' node to orchestrate this.`
  );

  console.log("[Bootstrapper] Executing 'plan_apple_news'...");
  const result = await ctx.runNode("plan_apple_news", {});
  return result;
};
