/**
 * Rachel 10 Core Types
 * Everything is a Node. A Plan is a Node. A Tool is a Node.
 */

// Context passed to every node upon execution
export interface NodeContext {
  // Hierarchical File-System Memory
  // Represents a root directory path (and all its children)
  memory: {
    basePath: string;
    read: <T = any>(relativePath: string) => Promise<T | null>;
    write: <T = any>(relativePath: string, data: T) => Promise<void>;
    list: (relativeDir: string) => Promise<string[]>;
  };
  
  // The LLM Compiler 
  llm: {
    generate: (prompt: string) => Promise<string>;
    writeNode: (name: string, code: string) => Promise<void>;
  };
  
  // The executor to call other nodes (enabling composability & implicit multi-agent)
  runNode: <T = any, R = any>(nodeName: string, args: T) => Promise<R>;
}

export type ExecutableNode<TArgs = any, TResult = any> = (
  args: TArgs,
  context: NodeContext
) => Promise<TResult>;
