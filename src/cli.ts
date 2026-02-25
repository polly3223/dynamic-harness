import blessed from "blessed";
import { createEngine } from "./engine/executor";
import { dispatchTask } from "./engine/dispatcher";

// 1. Setup the terminal screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Dynamic Harness CLI',
  fullUnicode: true
});

const chatLog = blessed.log({
  parent: screen, top: 0, left: 0, width: '50%', height: '85%',
  border: { type: 'line' }, style: { border: { fg: 'cyan' }, fg: 'white' },
  label: ' Chat History ', scrollable: true,
  scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } },
  tags: true
});

const chatInput = blessed.textbox({
  parent: screen, top: '85%', left: 0, width: '50%', height: '15%',
  border: { type: 'line' }, style: { border: { fg: 'cyan' }, fg: 'white' },
  label: ' Input (Type task & press Enter) ', inputOnFocus: true, keys: true
});

const systemLog = blessed.log({
  parent: screen, top: 0, left: '50%', width: '50%', height: '100%',
  border: { type: 'line' }, style: { border: { fg: 'magenta' }, fg: 'gray' },
  label: ' Engine & Compiler Logs ', scrollable: true,
  scrollbar: { ch: ' ', track: { bg: 'magenta' }, style: { inverse: true } },
  tags: true
});

const exitApp = () => process.exit(0);
screen.key(['escape', 'C-c'], exitApp);
chatInput.key(['escape', 'C-c'], exitApp);

const truncate = (str: string, maxLen = 1500) => {
  if (!str) return '';
  const cleanStr = str.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');
  if (cleanStr.length > maxLen) return cleanStr.substring(0, maxLen) + `\n... [TRUNCATED]`;
  return cleanStr;
};

console.log = (...args) => {
  systemLog.log(truncate(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')));
  screen.render();
};
console.error = (...args) => {
  systemLog.log(`{red-fg}${truncate(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))}{/red-fg}`);
  screen.render();
};

chatLog.log('{green-fg}🚀 Booting Dynamic Harness Engine...{/green-fg}');
chatLog.log('{gray-fg}Running on Qwen3 Coder Next. Type a task below to start.{/gray-fg}\n');

const ctx = createEngine();
let isProcessing = false;

chatInput.on('submit', async (text) => {
  if (isProcessing || !text.trim()) {
    chatInput.clearValue();
    chatInput.focus();
    screen.render();
    return;
  }

  isProcessing = true;
  chatLog.log(`{cyan-fg}User:{/cyan-fg} ${text}`);
  chatInput.clearValue();
  screen.render();

  let taskToExecute = text.trim();
  let retryCount = 0;
  const maxRetries = 1;

  while (retryCount <= maxRetries) {
    chatLog.log(retryCount === 0 ? `{yellow-fg}Rachel:{/yellow-fg} Thinking...` : `{yellow-fg}Rachel:{/yellow-fg} Self-healing from error and retrying...`);
    screen.render();

    try {
      const response = await dispatchTask(taskToExecute, ctx);
      chatLog.popLine(1); // FIX TS ERROR
      const responseStr = typeof response === 'object' ? JSON.stringify(response, null, 2) : String(response);
      chatLog.log(`{green-fg}Rachel:{/green-fg}\n${truncate(responseStr, 3000)}`);
      chatLog.log('---');
      break; // Success! Exit retry loop
    } catch (err) {
      chatLog.popLine(1); // FIX TS ERROR
      const errorMessage = (err as Error).message;
      
      if (retryCount < maxRetries) {
        console.error(`Attempting self-heal. Error was: ${errorMessage}`);
        taskToExecute = `The previous attempt to do "${text.trim()}" failed with this error: ${errorMessage}. Please compile a NEW plan that avoids this error (e.g. use Promise.allSettled instead of Promise.all, or use different APIs/tools).`;
        retryCount++;
      } else {
        chatLog.log(`{red-fg}Error:{/red-fg} ${errorMessage}`);
        break; // Failed after retries
      }
    }
  }

  isProcessing = false;
  chatInput.focus();
  screen.render();
});

chatInput.focus();
screen.render();
