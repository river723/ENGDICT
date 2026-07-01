// 预加载脚本：在 contextIsolation 下安全暴露原生能力到渲染进程
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 是否运行在 Electron 中
  isAvailable: () => true,

  // 导出：先弹保存对话框拿到路径，再写字节
  saveBackup: async (bytes, fileName) => {
    const saveResult = await ipcRenderer.invoke('dialog:saveBackup', fileName);
    if (saveResult.canceled) return { canceled: true };
    const writeResult = await ipcRenderer.invoke('file:writeBytes', saveResult.filePath, bytes);
    if (!writeResult.ok) return { canceled: false, error: writeResult.error };
    return { canceled: false, filePath: saveResult.filePath };
  },

  // 导入：弹打开对话框，返回 gzipped 字节
  openBackup: async () => {
    const result = await ipcRenderer.invoke('dialog:openBackup');
    return result;
  },

  // TTS 可用性
  ttsAvailable: async () => {
    const result = await ipcRenderer.invoke('tts:status');
    return !!result.available;
  },
});
