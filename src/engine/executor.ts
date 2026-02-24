import { join } from "path";
import { mkdir, readdir, stat } from "fs/promises";
import { NodeContext } from "../core/types";

// Setup base paths
const NODES_DIR = join(import.meta.dir, "..", "nodes");
const MEMORY_DIR = join(import.meta.dir, "..", "..", "memory");

/**
 * Creates the runtime context and returns the runNode execution engine.
 */
export function createEngine(): NodeContext["runNode"] {
  
  // 1. Implement Hierarchical File-System Memory
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
      // Ensure directory exists
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

  // 2. Implement the LLM Compiler (Mocked for the foundation)
  const llm: NodeContext["llm"] = {
    generate: async (prompt: string) => {
      console.log(`[LLM] Thinking about: "${prompt.substring(0, 50)}..."`);
      // In a real implementation, this calls OpenRouter/Gemini
      return "Mocked LLM Response"; 
    },
    
    writeNode: async (name: string, code: string) => {
      const fullPath = join(NODES_DIR, `${name}.ts`);
      console.log(`[Compiler] Writing new node: ${name}.ts`);
      await Bun.write(fullPath, code);
    }
  };

  // 3. The Core Executor Engine (with Hot-Reloading!)
  const runNode = async <T = any, R = any>(nodeName: string, args: T): Promise<R> => {
    console.log(`[Engine] Executing Node: ${nodeName}`);
    
    const nodePath = join(NODES_DIR, `${nodeName}.ts`);
    
    // HOT RELOADING TRICK:
    // By appending a timestamp to the import path, we force Bun/V8 to bypass 
    // the module cache. If the LLM just wrote or updated this node 1 millisecond ago, 
    // we guarantee we are loading the fresh plastic code, not the stale cache!
    const cacheBuster = Date.now();
    
    try {
      const module = await import(`${nodePath}?t=${cacheBuster}`);
      
      if (!module.run) {
        throw new Error(`Node ${nodeName} does not export a 'run' function.`);
      }

      // Construct the context for this specific execution
      const context: NodeContext = {
        memory,
        llm,
        runNode // Pass itself so nodes can recursively call other nodes!
      };

      // Execute the node
      const result = await module.run(args, context);
      return result;
      
    } catch (error) {
      console.error(`[Engine] Fatal Error in Node '${nodeName}':`, error);
      throw error; // Let the calling node (or global catcher) handle it
    }
  };

  return runNode;
}
