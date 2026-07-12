import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';
import { Platform } from 'react-native';

export type ExportFileResult = 'shared' | 'downloaded';

// 原生环境没有 window / electronAPI，安全获取避免 ReferenceError
const getElectronAPI = () =>
  (typeof window !== 'undefined' ? window.electronAPI : undefined);

class FileService {
  generateBackupFileName(): string {
    return `memo-grad-backup-${format(new Date(), 'yyyyMMdd-HHmm')}.bk`;
  }

  async exportBackupFile(jsonContent: string, fileName: string): Promise<ExportFileResult> {
    const compressed = gzipSync(strToU8(jsonContent));

    // Electron 桌面端：走原生保存对话框
    const electronAPI = getElectronAPI();
    if (electronAPI?.isAvailable()) {
      const result = await electronAPI.saveBackup(compressed, fileName);
      if (result.canceled) {
        throw new Error('EXPORT_CANCELED');
      }
      if (result.error) {
        throw new Error(`导出失败：${result.error}`);
      }
      return 'shared';
    }

    if (Platform.OS === 'web') {
      this.downloadBackupFile(compressed, fileName);
      return 'downloaded';
    }

    const file = new File(Paths.document, fileName);
    file.create({ overwrite: true });
    file.write(compressed);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('当前设备不支持系统分享，无法导出备份文件。');
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/octet-stream',
      dialogTitle: '导出学习数据备份',
      UTI: 'public.data',
    });

    return 'shared';
  }

  async pickAndReadBackupFile(): Promise<string | null> {
    // Electron 桌面端：走原生打开对话框
    const electronAPI = getElectronAPI();
    if (electronAPI?.isAvailable()) {
      const result = await electronAPI.openBackup();
      if (result.canceled) {
        return null;
      }
      if (result.error || !result.bytes) {
        throw new Error('备份文件读取失败。');
      }
      try {
        return strFromU8(gunzipSync(result.bytes));
      } catch (error) {
        throw new Error('备份文件已损坏或格式不正确，无法解压。');
      }
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      return null;
    }

    if (!asset.name.toLowerCase().endsWith('.bk')) {
      throw new Error('请选择本应用导出的 .bk 备份文件。');
    }

    const compressed = await this.readAssetBytes(asset);

    try {
      return strFromU8(gunzipSync(compressed));
    } catch (error) {
      throw new Error('备份文件已损坏或格式不正确，无法解压。');
    }
  }

  private async readAssetBytes(asset: DocumentPicker.DocumentPickerAsset): Promise<Uint8Array> {
    if (Platform.OS === 'web') {
      if (asset.file) {
        return new Uint8Array(await asset.file.arrayBuffer());
      }
      if (asset.base64) {
        return this.decodeBase64ToBytes(asset.base64);
      }
    }

    const file = new File(asset.uri);
    return file.bytes();
  }

  private downloadBackupFile(content: Uint8Array, fileName: string) {
    const buffer = content.buffer.slice(
      content.byteOffset,
      content.byteOffset + content.byteLength
    ) as ArrayBuffer;
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private decodeBase64ToBytes(base64: string): Uint8Array {
    if (typeof atob === 'function') {
      const binary = atob(base64);
      return Uint8Array.from(binary, char => char.charCodeAt(0));
    }

    throw new Error('当前环境不支持读取该备份文件内容');
  }
}

export default new FileService();
