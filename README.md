# Dynamic Harness: Dynamic Harness

A completely plastic AI engine where Plans, Memory, and Tools are all executable TypeScript nodes running in a native Bun environment.

## The Architecture
- **Unified Nodes:** There is no difference between a "Tool" and a "Plan". They are both just composable `.ts` files.
- **Dynamic Compiler:** The LLM actively writes new TypeScript nodes when it lacks a tool to complete a task.
- **Hot-Reloading:** Nodes are imported dynamically at runtime with a cache-buster, meaning the LLM can write a tool and use it in the exact same execution loop without a restart.
- **Dispatcher:** A stateless entry point that reads the user's prompt, scans the existing nodes, and decides whether to answer directly, reuse an existing plan, or instruct the compiler to write a new one.

## Setup

1. Install [Bun](https://bun.sh/).
2. Clone this repository.
3. Install dependencies (none needed besides Bun itself!):
```bash
bun install
```
4. Set up your OpenRouter API key:
```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

## Running
Start the engine:
```bash
bun start
```

## Project Structure
- `src/core/types.ts`: The unified `ExecutableNode` signature.
- `src/engine/`: The runtime environment (Executor, Compiler, Dispatcher).
- `src/nodes/`: Where the LLM will dynamically generate its own TypeScript tools and plans.
- `examples/nodes/`: Examples of what the LLM generates when asked to perform complex parallel tasks.

## License
MIT
