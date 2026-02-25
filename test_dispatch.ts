import { dispatchTask } from "./src/engine/dispatcher";
import { createEngine } from "./src/engine/executor";

async function run() {
  const ctx = createEngine();
  const res = await dispatchTask("find and summarize the 5 most recent aapl news", ctx);
  console.log("Result:", res);
}

run();
