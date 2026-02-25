import { join } from "path";
import { mkdir, readdir } from "fs/promises";
import type { NodeContext } from "../core/types";
import { generateContent, writeNode } from "./llm";

const NODES_DIR = join(import.meta.dir, "..", "nodes");
const MEMORY_DIR = join(import.meta.dir, "..", "..", "memory");

export function createEngine(): NodeContext {
  
  const memory: NodeContext["memory"] = {
    basePath: MEMORY_DIR,
    read: async <T>(relativePath: string): Promise<T | null> => {
      try {
        const file = Bun.file(join(MEMORY_DIR, relativePath));
        if (!(await file.exists())) return null;
        return await file.json();
      } catch (e) { return null; }
    },
    write: async <T>(relativePath: string, data: T): Promise<void> => {
      const fullPath = join(MEMORY_DIR, relativePath);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      if (dir) await mkdir(dir, { recursive: true });
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

  const _internalRunNode = async (nodeName: string, args: any, depth: number = 0): Promise<any> => {
    const indent = depth === 0 ? "" : "│  ".repeat(depth - 1) + "├─ ";
    console.log(`{cyan-fg}${indent}► [Node] ${nodeName}{/cyan-fg}`);
    
    const available = await getAvailableNodes();
    if (!available.includes(nodeName)) throw new Error(`Node '${nodeName}' does not exist.`);

    const nodePath = join(NODES_DIR, `${nodeName}.ts`);
    const cacheBuster = Date.now();
    
    try {
      const module = await import(`${nodePath}?t=${cacheBuster}`);
      if (!module.run) throw new Error(`Node ${nodeName} lacks export 'run'.`);

      const context: NodeContext = { 
        memory, llm, getAvailableNodes, 
        runNode: (childName, childArgs) => _internalRunNode(childName, childArgs, depth + 1) 
      };
      
      return await module.run(args, context);
    } catch (error) {
      console.error(`${indent}✖ Fatal Error in '${nodeName}': ${(error as Error).message}`);
      throw error;
    }
  };

  return { memory, llm, getAvailableNodes, runNode: (name, args) => _internalRunNode(name, args, 0) };
}
