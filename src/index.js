const { log } = require('console');
const { app, BrowserWindow, ipcMain, desktopCapturer, dialog } = require('electron');
require('@electron/remote/main').initialize()
require('v8-compile-cache');
const path = require('path');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'logo.png')
  });

  mainWindow.setMenu(null);
  mainWindow.setResizable(false)

  require('@electron/remote/main').enable(mainWindow.webContents)

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

 // mainWindow.webContents.openDevTools();

  ipcMain.on('selected-area-data', (event, data) => {
    mainWindow.webContents.send('selected-area-data-updated', data);
  });
  // mainWindow.setAlwaysOnTop(true, 'floating');

  mainWindow.show();

};

function ipcHadle() {

  ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', async (event, opts) => {
    const sources = await desktopCapturer.getSources({
      types: [
        'screen',
        'window'
      ]
    });
    return sources;
  });

}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  ipcHadle();

});
