// Electron 渲染进程 API 类型声明
export interface ElectronSaveResult {
  canceled: boolean;
  filePath?: string;
  error?: string;
}

export interface ElectronOpenResult {
  canceled: boolean;
  bytes?: Uint8Array;
  error?: string;
}

export interface ElectronAPI {
  isAvailable(): boolean;
  saveBackup(bytes: Uint8Array, fileName: string): Promise<ElectronSaveResult>;
  openBackup(): Promise<ElectronOpenResult>;
  ttsAvailable(): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
