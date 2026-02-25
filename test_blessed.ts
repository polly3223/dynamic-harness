import blessed from "blessed";

const screen = blessed.screen({ smartCSR: true });
screen.title = 'Test CLI';

const left = blessed.log({
  parent: screen, left: 0, top: 0, width: '50%', height: '90%', border: 'line', label: ' Chat ',
});

const input = blessed.textbox({
  parent: screen, left: 0, top: '90%', width: '50%', height: '10%', border: 'line', inputOnFocus: true, label: ' Input (Enter to send) ',
});

const right = blessed.log({
  parent: screen, left: '50%', top: 0, width: '50%', height: '100%', border: 'line', label: ' Logs ',
});

screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

input.on('submit', (text) => {
  left.add(`User: ${text}`);
  right.add(`[System] Executing: ${text}`);
  input.clearValue();
  input.focus();
  screen.render();
});

input.focus();
screen.render();
