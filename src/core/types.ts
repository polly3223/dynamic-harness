/**
 * Rachel 10 Core Types
 */

export interface NodeContext {
  memory: {
    basePath: string;
    read: <T = any>(relativePath: string) => Promise<T | null>;
    write: <T = any>(relativePath: string, data: T) => Promise<void>;
    list: (relativeDir: string) => Promise<string[]>;
  };
  
  llm: {
    generate: (prompt: string) => Promise<string>;
    writeNode: (name: string, prompt: string) => Promise<void>;
  };
  
  // The system can now ask itself what nodes are available
  getAvailableNodes: () => Promise<string[]>;
  
  runNode: <T = any, R = any>(nodeName: string, args: T) => Promise<R>;
}

export type ExecutableNode<TArgs = any, TResult = any> = (
  args: TArgs,
  context: NodeContext
) => Promise<TResult>;
