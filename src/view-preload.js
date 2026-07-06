const { ipcRenderer } = require('electron');

window.addEventListener('wheel', (event) => {
  if (!event.ctrlKey) return;

  event.preventDefault();
  ipcRenderer.send('browser:zoom-delta', event.deltaY < 0 ? 1 : -1);
}, { capture: true, passive: false });
