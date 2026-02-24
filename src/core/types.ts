/**
 * Rachel 10 Core Types
 * Everything is a Node. A Plan is a Node. A Tool is a Node.
 */

// Context passed to every node upon execution
export interface NodeContext {
  // Dumb Memory access (JSON/SQLite)
  db: any; 
  
  // The LLM Compiler (used if a node needs inline intelligence or needs to write a new node)
  llm: {
    generate: (prompt: string) => Promise<string>;
    writeNode: (name: string, description: string) => Promise<void>;
  };
  
  // The executor to call other nodes (enabling composability & implicit multi-agent)
  runNode: <T = any, R = any>(nodeName: string, args: T) => Promise<R>;
}

// Unified signature for all executable nodes
export type ExecutableNode<TArgs = any, TResult = any> = (
  args: TArgs,
  context: NodeContext
) => Promise<TResult>;
