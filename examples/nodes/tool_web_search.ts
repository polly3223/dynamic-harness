import { ExecutableNode } from "../../src/core/types";

export const run: ExecutableNode = async (args, ctx) => {
  const { query } = args;
  
  if (!query || typeof query !== "string") {
    throw new Error("A valid string 'query' is required.");
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  // DuckDuckGo requires a User-Agent to prevent basic 403 Forbidden errors
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo request failed with status: ${response.status}`);
  }

  const html = await response.text();

  // Simple regex to extract search result headers and their anchor tags
  // DuckDuckGo HTML results typically wrap the title link in <h2 class="result__title">...</h2>
  const regex = /<h2 class="result__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  
  const results: { title: string; url: string }[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    let rawUrl = match[1];
    let rawTitle = match[2];

    // DuckDuckGo often wraps outbound links in a redirect parameter (uddg)
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch && uddgMatch[1]) {
      try {
        rawUrl = decodeURIComponent(uddgMatch[1]);
      } catch (e) {
        // Fallback to rawUrl if decoding fails
      }
    } else if (rawUrl.startsWith('//')) {
      rawUrl = `https:${rawUrl}`;
    }

    // Clean up the title by stripping any inner HTML tags (like <b> for bolded keywords) and decoding basic HTML entities
    const cleanTitle = rawTitle
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();

    if (rawUrl && cleanTitle) {
      results.push({
        title: cleanTitle,
        url: rawUrl
      });
    }
  }

  return { results };
};