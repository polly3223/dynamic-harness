import { ExecutableNode } from "../../src/core/types";

export const run: ExecutableNode = async (args, ctx) => {
    const query = "top news articles about Microsoft";
    
    const searchResponse = await ctx.runNode("tool_web_search", { query });

    let results: any[] = [];
    if (Array.isArray(searchResponse)) {
        results = searchResponse;
    } else if (searchResponse && typeof searchResponse === 'object') {
        results = searchResponse.results || searchResponse.data || [];
    }

    if (!results || results.length === 0) {
        // Fallback if the structure doesn't match expected array formats
        return `Could not parse top 3 articles natively. Raw search results:\n${JSON.stringify(searchResponse, null, 2)}`;
    }

    const top3 = results.slice(0, 3).map((item, index) => {
        const title = item.title || "No Title";
        const url = item.url || item.link || "No URL";
        return `${index + 1}. ${title}\n   URL: ${url}`;
    });

    return `Top 3 News Articles about Microsoft:\n\n${top3.join("\n\n")}`;
};