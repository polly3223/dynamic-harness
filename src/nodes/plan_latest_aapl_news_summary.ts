import type { ExecutableNode } from "../core/types";

export const run: ExecutableNode = async (args, ctx) => {
  const searchResult = (await ctx.runNode("tool_web_search", {
    query: "AAPL news recent",
  })) as { title: string; link: string; pubDate: string; source: string }[];

  const top5 = [...searchResult]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 5);

  const processed = await Promise.allSettled(
    top5.map(async (item) => {
      const rawText = await ctx.runNode("tool_web_fetch", { url: item.link });
      const summary = await ctx.runNode("tool_summarize", {
        text: rawText,
        instructions:
          "Summarize this article in 1–2 sentences, focusing on key financial or strategic developments related to Apple.",
      });
      return {
        title: item.title,
        source: item.source,
        link: item.link,
        pubDate: item.pubDate,
        summary,
      };
    })
  );

  const summaries = processed
    .map((p) => (p.status === "fulfilled" ? p.value : null))
    .filter((x): x is Exclude<typeof x, null> => x !== null);

  await ctx.memory.write("apple_news_summaries.json", summaries);

  return summaries;
};