import { ExecutableNode } from "../../src/core/types";

export const run: ExecutableNode = async (args, ctx) => {
    await ctx.llm.writeNode(
        "tool_web_search",
        "Write an ExecutableNode that takes { query: string }. It must fetch the DuckDuckGo HTML endpoint (https://html.duckduckgo.com/html/?q=encodeURIComponent(query)). Parse the response text using simple Regex to extract search result href links and titles. Return an object: { results: { title: string, url: string }[] }."
    );

    await ctx.llm.writeNode(
        "tool_web_fetch",
        "Write an ExecutableNode that takes { url: string }. It must fetch the URL, get the text response, strip all HTML tags using a regex like /<[^>]*>?/gm, and return { text: string } with the raw text content."
    );

    const searchRes: any = await ctx.runNode("tool_web_search", { query: "Apple news" });
    
    const top3 = searchRes.results?.slice(0, 3) || [];

    const fetchPromises = top3.map((item: any) => 
        ctx.runNode("tool_web_fetch", { url: item.url })
    );
    const fetchedContents: any[] = await Promise.all(fetchPromises);

    const summaryPromises = fetchedContents.map((contentRes: any) => {
        const rawText = contentRes.text || "";
        const truncatedText = rawText.substring(0, 5000); 
        return ctx.llm.generate(`Please summarize the following news article content:\n\n${truncatedText}`);
    });
    
    const summaries = await Promise.all(summaryPromises);

    return summaries;
};