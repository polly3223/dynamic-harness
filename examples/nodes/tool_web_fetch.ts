import { ExecutableNode } from "../core/types";

export const run: ExecutableNode = async (args, ctx) => {
  const url = args.url as string;
  
  if (!url) {
    throw new Error("Missing required argument: url");
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const rawHtml = await response.text();
    const strippedText = rawHtml.replace(/<[^>]*>?/gm, "");

    return { text: strippedText };
  } catch (error) {
    throw new Error(`Error fetching or processing URL: ${error instanceof Error ? error.message : String(error)}`);
  }
};