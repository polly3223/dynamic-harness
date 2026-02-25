import { join } from "path";
import { mkdir, readdir } from "fs/promises";
import { NodeContext } from "../core/types";
import { generateContent, writeNode } from "./llm";

const NODES_DIR = join(import.meta.dir, "..", "nodes");
const MEMORY_DIR = join(import.meta.dir, "..", "..", "memory");

export function createEngine(): NodeContext {
  
  const memory: NodeContext["memory"] = {
    basePath: MEMORY_DIR,
    read: async <T>(relativePath: string): Promise<T | null> => {
      try {
        const file = Bun.file(join(MEMORY_DIR, relativePath));
        return (await file.exists()) ? await file.json() : null;
      } catch (e) { return null; }
    },
    write: async <T>(relativePath: string, data: T): Promise<void> => {
      const fullPath = join(MEMORY_DIR, relativePath);
      await mkdir(fullPath.substring(0, fullPath.lastIndexOf("/")), { recursive: true });
      await Bun.write(fullPath, JSON.stringify(data, null, 2));
    },
    list: async (relativeDir: string): Promise<string[]> => {
      try { return await readdir(join(MEMORY_DIR, relativeDir)); } catch (e) { return []; }
    }
  };

  const llm: NodeContext["llm"] = { generate: generateContent, writeNode };

  const getAvailableNodes = async (): Promise<string[]> => {
    try {
      const files = await readdir(NODES_DIR);
      return files.filter(f => f.endsWith('.ts')).map(f => f.replace('.ts', ''));
    } catch (e) { return []; }
  };

  // Internal executor with depth tracking for the UI Graph
  const _internalRunNode = async (nodeName: string, args: any, depth: number = 0): Promise<any> => {
    // UI Graph formatting
    const indent = depth === 0 ? "" : "│  ".repeat(depth - 1) + "├─ ";
    const color = depth === 0 ? "{green-fg}" : "{cyan-fg}";
    console.log(`${color}${indent}► [Node] ${nodeName}${color === '{green-fg}' ? '{/green-fg}' : '{/cyan-fg}'}`);
    
    const available = await getAvailableNodes();
    if (!available.includes(nodeName)) throw new Error(`Node '${nodeName}' does not exist.`);

    const nodePath = join(NODES_DIR, `${nodeName}.ts`);
    const cacheBuster = Date.now();
    
    try {
      const module = await import(`${nodePath}?t=${cacheBuster}`);
      if (!module.run) throw new Error(`Node ${nodeName} lacks export 'run'.`);

      // Recursively pass depth+1 to children so the graph indents properly
      const context: NodeContext = { 
        memory, llm, getAvailableNodes, 
        runNode: (childName, childArgs) => _internalRunNode(childName, childArgs, depth + 1) 
      };
      
      return await module.run(args, context);
    } catch (error) {
      console.error(`{red-fg}${indent}✖ Fatal Error in '${nodeName}': ${(error as Error).message}{/red-fg}`);
      throw error;
    }
  };

  return { memory, llm, getAvailableNodes, runNode: (name, args) => _internalRunNode(name, args, 0) };
}
