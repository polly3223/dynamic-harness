import blessed from "blessed";
import { createEngine } from "./engine/executor";
import { dispatchTask } from "./engine/dispatcher";

// 1. Setup the terminal screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Dynamic Harness CLI'
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
  tags: true // FIX: This renders the {color-fg} tags
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
  tags: true // FIX: Renders tags here too
});

// FIX: Catch Ctrl-C on BOTH the screen and the input box
const exitApp = () => process.exit(0);
screen.key(['escape', 'C-c'], exitApp);
chatInput.key(['escape', 'C-c'], exitApp);

// Override console methods to pipe into the Right Panel
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  systemLog.log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  screen.render();
};

console.error = (...args) => {
  systemLog.log(`{red-fg}${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}{/red-fg}`);
  screen.render();
};

// Start the engine
chatLog.log('{green-fg}🚀 Booting Dynamic Harness Engine...{/green-fg}');
chatLog.log('{gray-fg}Running on Qwen3 Coder Next. Type a task below to start.{/gray-fg}\n');

const ctx = createEngine();

let isProcessing = false;

// Handle Chat Submission
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
    chatLog.log(`{green-fg}Rachel:{/green-fg} ${typeof response === 'object' ? JSON.stringify(response, null, 2) : response}`);
    chatLog.log('---');
  } catch (err) {
    chatLog.log(`{red-fg}Error:{/red-fg} ${(err as Error).message}`);
  }

  isProcessing = false;
  chatInput.focus();
  screen.render();
});

// Focus and render
chatInput.focus();
screen.render();
