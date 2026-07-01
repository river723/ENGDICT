// Electron 主进程：创建窗口、注册原生文件对话框 IPC
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: '考研英语生词本',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    // 开发模式加载 Metro/Webpack dev server
    win.loadURL('http://localhost:8081');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 生产模式加载 expo export:web 产物
    win.loadFile(path.join(__dirname, '..', 'web-build', 'index.html'));
  }
}

// 导出备份：弹出原生保存对话框，写入 gzipped 字节
ipcMain.handle('dialog:saveBackup', async (_event, fileName) => {
  const defaultName = fileName || 'memo-grad-backup.bk';
  const result = await dialog.showSaveDialog({
    title: '导出学习数据备份',
    defaultPath: defaultName,
    filters: [{ name: '备份文件', extensions: ['bk'] }],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  return { canceled: false, filePath: result.filePath };
});

// 写入字节到指定路径（由渲染进程提供 gzipped 内容）
ipcMain.handle('file:writeBytes', async (_event, filePath, bytes) => {
  try {
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
});

// 导入备份：弹出原生打开对话框，读取 .bk 字节
ipcMain.handle('dialog:openBackup', async () => {
  const result = await dialog.showOpenDialog({
    title: '导入学习数据备份',
    properties: ['openFile'],
    filters: [{ name: '备份文件', extensions: ['bk'] }],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  try {
    const buffer = await fs.readFile(result.filePaths[0]);
    return { canceled: false, bytes: new Uint8Array(buffer) };
  } catch (error) {
    return { canceled: false, error: String(error) };
  }
});

// TTS 可用性：Electron 内置 Chromium，SpeechSynthesis 始终可用
ipcMain.handle('tts:status', async () => {
  return { available: true };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
