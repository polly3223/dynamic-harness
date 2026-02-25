import blessed from "blessed";
import { createEngine } from "./engine/executor";
import { dispatchTask } from "./engine/dispatcher";

// 1. Setup the terminal screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Dynamic Harness CLI',
  fullUnicode: true // Helps with special characters
});

// Left Panel: Chat Log (Top)
const chatLog = blessed.log({
  parent: screen,
  top: 0,
  left: 0,
  width: '50%',
  height: '85%',
  border: { type: 'line' },
  style: { border: { fg: 'cyan' }, fg: 'white' },
  label: ' Chat History ',
  scrollable: true,
  scrollbar: { ch: ' ', track: { bg: 'cyan' }, style: { inverse: true } },
  tags: true
});

// Left Panel: Input Box (Bottom)
const chatInput = blessed.textbox({
  parent: screen,
  top: '85%',
  left: 0,
  width: '50%',
  height: '15%',
  border: { type: 'line' },
  style: { border: { fg: 'cyan' }, fg: 'white' },
  label: ' Input (Type task & press Enter) ',
  inputOnFocus: true,
  keys: true
});

// Right Panel: Execution / Engine Logs
const systemLog = blessed.log({
  parent: screen,
  top: 0,
  left: '50%',
  width: '50%',
  height: '100%',
  border: { type: 'line' },
  style: { border: { fg: 'magenta' }, fg: 'gray' },
  label: ' Engine & Compiler Logs ',
  scrollable: true,
  scrollbar: { ch: ' ', track: { bg: 'magenta' }, style: { inverse: true } },
  tags: true
});

const exitApp = () => process.exit(0);
screen.key(['escape', 'C-c'], exitApp);
chatInput.key(['escape', 'C-c'], exitApp);

// HELPER: Truncate massive strings to prevent UI tearing in blessed
const truncate = (str: string, maxLen = 1500) => {
  if (!str) return '';
  // Clean out weird control characters that can break terminal rendering
  const cleanStr = str.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');
  if (cleanStr.length > maxLen) {
    return cleanStr.substring(0, maxLen) + `\n... [TRUNCATED: ${cleanStr.length - maxLen} more characters]`;
  }
  return cleanStr;
};

// Override console methods
console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  systemLog.log(truncate(msg, 2000)); // Cap logs in the right panel
  screen.render();
};

console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  systemLog.log(`{red-fg}${truncate(msg, 2000)}{/red-fg}`);
  screen.render();
};

// Start the engine
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
  chatLog.log(`{yellow-fg}Rachel:{/yellow-fg} Thinking...`);
  screen.render();

  try {
    const response = await dispatchTask(text.trim(), ctx);
    
    // Clear "Thinking..."
    chatLog.popLine();
    
    const responseStr = typeof response === 'object' ? JSON.stringify(response, null, 2) : String(response);
    
    // Cap the final chat output so massive raw HTML doesn't break the left panel either
    chatLog.log(`{green-fg}Rachel:{/green-fg}\n${truncate(responseStr, 3000)}`);
    chatLog.log('---');
  } catch (err) {
    chatLog.popLine();
    chatLog.log(`{red-fg}Error:{/red-fg} ${(err as Error).message}`);
  }

  isProcessing = false;
  chatInput.focus();
  screen.render();
});

chatInput.focus();
screen.render();
