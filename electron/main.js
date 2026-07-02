// Electron 主进程：创建窗口、注册原生文件对话框 IPC
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isDev = !app.isPackaged;

// Metro 导出的产物用绝对路径（/_expo/、/assets/、/favicon.ico）。
// 直接用 file:// 加载时这些路径会指向盘符根导致资源 404，且字体通过 fetch(FontFace)
// 加载会触发 NetworkError → 应用报错页。
// 解决办法：注册一个 app:// 自定义协议，把 dist/ 作为站点根目录。绝对路径由此正确解析，
// 且该协议声明为 standard + supportFetchAPI，字体的 fetch 请求也能成功。
//
// 注意：打包后 dist/ 位于 app.asar 归档内，net.fetch('file://…/app.asar/…') 读不到 asar，
// 会全部报 NetworkError。这里改用 fs.readFile（Electron 内已 asar-aware）读取字节并手动
// 构造 Response，避免 asar 读取失败。
// 打包后 dist/ 通过 extraResources 复制到 resources/dist（asar 外），
// 用 process.resourcesPath 定位；开发/未打包时用项目根的 dist/。
// （曾尝试把 dist 放进 asar，但 electron-builder 对任何 node_modules 路径段有硬编码
//  排除，导致 dist/assets/node_modules/@expo/vector-icons 的字体丢失 → 字体 404 →
//  NetworkError。放到 asar 外的 extraResources 可彻底规避。）
const DIST_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'dist')
  : path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const { pathname } = new URL(request.url);
    // app://local/xxx → dist/xxx；根路径回退到 index.html
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const filePath = path.join(DIST_DIR, rel);
    try {
      const data = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      return new Response(data, { status: 200, headers: { 'Content-Type': contentType } });
    } catch (err) {
      return new Response(`Not found: ${rel}`, { status: 404 });
    }
  });
}

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
    // 生产模式：通过 app:// 协议加载 Metro 导出产物（dist/）
    win.loadURL('app://local/index.html');
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
  if (!isDev) {
    registerAppProtocol();
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
