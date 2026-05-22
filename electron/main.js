const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'HisabApp',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Updated loadURL for better compatibility on Windows
  win.loadURL(`file://${path.join(__dirname, '..', 'out', 'index.html')}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
