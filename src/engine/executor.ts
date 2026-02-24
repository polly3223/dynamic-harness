import { join } from "path";
import { mkdir, readdir } from "fs/promises";
import { NodeContext } from "../core/types";
import { generateContent, writeNode } from "./llm";

const NODES_DIR = join(import.meta.dir, "..", "nodes");
const MEMORY_DIR = join(import.meta.dir, "..", "..", "memory");

export function createEngine(): NodeContext["runNode"] {
  
  const memory: NodeContext["memory"] = {
    basePath: MEMORY_DIR,
    read: async <T>(relativePath: string): Promise<T | null> => {
      const fullPath = join(MEMORY_DIR, relativePath);
      try {
        const file = Bun.file(fullPath);
        if (!(await file.exists())) return null;
        return await file.json();
      } catch (e) {
        return null;
      }
    },
    write: async <T>(relativePath: string, data: T): Promise<void> => {
      const fullPath = join(MEMORY_DIR, relativePath);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await Bun.write(fullPath, JSON.stringify(data, null, 2));
    },
    list: async (relativeDir: string): Promise<string[]> => {
      const fullPath = join(MEMORY_DIR, relativeDir);
      try {
        return await readdir(fullPath);
      } catch (e) {
        return [];
      }
    }
  };

  const llm: NodeContext["llm"] = {
    generate: generateContent,
    writeNode: writeNode
  };

  const runNode = async <T = any, R = any>(nodeName: string, args: T): Promise<R> => {
    console.log(`[Engine] Executing Node: ${nodeName}`);
    const nodePath = join(NODES_DIR, `${nodeName}.ts`);
    const cacheBuster = Date.now();
    
    try {
      const module = await import(`${nodePath}?t=${cacheBuster}`);
      if (!module.run) throw new Error(`Node ${nodeName} does not export a 'run' function.`);

      const context: NodeContext = { memory, llm, runNode };
      return await module.run(args, context);
      
    } catch (error) {
      console.error(`[Engine] Fatal Error in Node '${nodeName}':`, error);
      throw error;
    }
  };

  return runNode;
}
