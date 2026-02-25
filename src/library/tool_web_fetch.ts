import type { ExecutableNode } from "../core/types";

/**
 * tool_web_fetch
 * A stable tool to fetch raw content from a URL.
 */
export const run: ExecutableNode<{ url: string }, string> = async (args, context) => {
  const { url } = args;
  if (!url) throw new Error("Missing url argument");

  console.log(`[Library] Fetching: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  
  const html = await response.text();
  
  // Basic HTML tag stripping
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
             .replace(/<style[\s\S]*?<\/style>/gi, "")
             .replace(/<[^>]+>/g, " ")
             .replace(/\s+/g, " ")
             .trim()
             .substring(0, 10000); // Truncate to 10k chars
};
