# Rachel 10: Polymorphic Agent Engine

The next evolution of AI agent architecture. Instead of a static harness trying to route a "chat assistant" through fixed tools, **everything is an executable TypeScript node**.

### The Core Philosophy
1. **Unified Nodes:** There is no difference between a "Tool" and a "Plan". They are both just composable `.ts` files executing in a native Bun environment.
2. **Implicit Multi-Agent:** Because plans are just async TypeScript, spawning multiple parallel agents is as simple as `Promise.all([runNode('A'), runNode('B')])`.
3. **Programmatic Fast-Paths:** Nodes can read dumb memory (SQLite/JSON) and conditionally bypass the LLM entirely if they already have the answer. 
4. **Self-Healing at the Edge:** Errors are caught locally inside the node. The node can use the LLM to dynamically write a *new* node to bypass the error, falling back to a Global Error Catcher only as a last resort.

## Architecture

```mermaid
graph TD
    Engine[Execution Engine] -->|Invokes| NodeA[Node: orchestrate_research.ts]
    
    subgraph Executable Nodes
        NodeA -->|Promise.all| NodeB[Node: scrape_site_1.ts]
        NodeA -->|Promise.all| NodeC[Node: scrape_site_2.ts]
        
        NodeB -->|If fail, compile| NodeD[Node: custom_headless_scraper.ts]
    end
    
    NodeA -.->|Reads/Writes| Mem[(Dumb Memory: SQLite)]
    NodeC -.->|Calls| LLM[LLM API: Summarize]
    
    style Engine fill:#4f46e5,stroke:#fff,color:#fff
    style NodeA fill:#059669,stroke:#fff,color:#fff
    style NodeB fill:#2563eb,stroke:#fff,color:#fff
    style NodeC fill:#2563eb,stroke:#fff,color:#fff
    style NodeD fill:#be123c,stroke:#fff,color:#fff
    style Mem fill:#ca8a04,stroke:#fff,color:#fff
```

## Error Handling & Plasticity

```mermaid
flowchart LR
    Start(Execute Node) --> Action{Attempt Action}
    Action -- Success --> Done(Return Data)
    Action -- Throws Error --> LocalCatch[Local Catch Block]
    
    LocalCatch --> LLMFix{Can LLM fix inline?}
    LLMFix -- Yes --> WriteNew[Write new ad-hoc Node] --> ExecuteNew[Run New Node] --> Done
    LLMFix -- No --> GlobalCatch[Global Error Catcher]
    
    GlobalCatch --> AlertUser[Alert User / Halt]
    
    style LocalCatch fill:#f59e0b,color:#000
    style WriteNew fill:#059669,color:#fff
    style GlobalCatch fill:#dc2626,color:#fff
```

## Running the Engine
*(Implementation pending)*
The engine simply provides the runtime context (LLM compiler, Database access, and Node Executor) and begins evaluating the root node.
