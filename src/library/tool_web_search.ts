import type { ExecutableNode } from "../core/types";

/**
 * tool_web_search
 * A stable tool to search the web using Google News RSS.
 * Returns a list of titles, links, and snippets.
 */
export const run: ExecutableNode<{ query: string }, any[]> = async (args, context) => {
  const { query } = args;
  if (!query) throw new Error("Missing query argument");

  console.log(`[Library] Searching for: ${query}`);
  
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  
  const response = await fetch(rssUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} searching for ${query}`);
  
  const xml = await response.text();
  
  // Clean regex to extract item data from RSS
  const items: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title>(.*?)<\/title>/)?.[1] || "";
    const link = content.match(/<link>(.*?)<\/link>/)?.[1] || "";
    const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    const source = content.match(/<source.*?>(.*?)<\/source>/)?.[1] || "";
    
    items.push({ title, link, pubDate, source });
    if (items.length >= 20) break; // Limit to 20
  }

  return items;
};
