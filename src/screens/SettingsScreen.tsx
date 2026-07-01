import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import {
  Card,
  Text,
  Switch,
  List,
  Button as PaperButton,
  Divider,
  Surface,
} from 'react-native-paper';
import StorageService, { DEFAULT_SETTINGS } from '../services/StorageService';
import FileService from '../services/FileService';
import { UI_CONFIG } from '../constants';
import { AppSettings } from '../types';
import { useAppTheme } from '../theme/theme';
import { useThemeContext } from '../providers/ThemeProvider';
import { makeStyles } from '../utils/useStyles';

const BACKUP_FIELDS = [
  'words',
  'studyRecords',
  'studyPlans',
  'ignoredWordbankWords',
  'settings',
];

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText = '确认'
) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: '取消', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};

const getBackupValidationError = (jsonData: string): string | null => {
  let data: unknown;

  try {
    data = JSON.parse(jsonData);
  } catch (error) {
    return '备份内容无法解析，请选择正确的 .bk 备份文件。';
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return '这不是本应用的备份文件。';
  }

  const backup = data as Record<string, unknown>;
  const hasBackupField = BACKUP_FIELDS.some(field =>
    Object.prototype.hasOwnProperty.call(backup, field)
  );

  return hasBackupField ? null : '这不是本应用的备份文件。';
};

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { setThemeMode } = useThemeContext();
  const styles = useStyles();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await StorageService.getSettings();
      setSettings(prev => ({ ...prev, ...savedSettings }));
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updates = { ...newSettings };
      if (newSettings.soundEnabled === false) {
        updates.autoPlaySound = false;
      }
      await StorageService.saveSettings(updates);
      const latestSettings = await StorageService.getSettings();
      setSettings(latestSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleExport = async () => {
    if (isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const exportedData = await StorageService.exportData();
      const fileName = FileService.generateBackupFileName();

      const result = await FileService.exportBackupFile(exportedData, fileName);
      showMessage(
        '导出成功',
        result === 'downloaded'
          ? '备份文件已开始下载，请妥善保存 .bk 文件。'
          : '已打开系统分享面板，请选择保存位置并妥善保存 .bk 文件。'
      );
    } catch (error: any) {
      if (error?.message === 'EXPORT_CANCELED') {
        return;
      }
      showMessage('导出失败', error.message || '无法导出备份文件');
    } finally {
      setIsExporting(false);
    }
  };

  const runImport = async () => {
    if (isImporting) {
      return;
    }

    setIsImporting(true);
    try {
      const fileText = await FileService.pickAndReadBackupFile();
      if (!fileText) {
        return;
      }

      const validationError = getBackupValidationError(fileText);
      if (validationError) {
        showMessage('导入失败', validationError);
        return;
      }

      await StorageService.importData(fileText);
      await loadSettings();
      showMessage('导入成功', '备份已成功导入。');
    } catch (error: any) {
      showMessage('导入失败', error.message || '无法导入备份文件，请检查文件格式');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = async () => {
    if (Platform.OS === 'web') {
      await runImport();
      return;
    }

    Alert.alert(
      '导入备份',
      '请选择本应用导出的 .bk 备份文件。导入会覆盖本机已有学习数据。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '选择 .bk 文件',
          onPress: runImport,
        }
      ]
    );
  };

  const handleClearData = () => {
    showConfirm(
      '确认清除',
      '确定要清除所有数据吗？此操作无法撤销。',
      async () => {
        await StorageService.clearAllData();
        setSettings(DEFAULT_SETTINGS);
        setThemeMode('light');
        showMessage('已清除', '所有数据已清除');
      },
      '清除'
    );
  };

  const handleResetDefaults = () => {
    showConfirm('恢复默认', '确定要恢复所有设置为默认值吗？', async () => {
      await StorageService.resetSettings();
      setSettings(DEFAULT_SETTINGS);
      setThemeMode('light');
      showMessage('已恢复', '所有设置已恢复为默认值');
    });
  };

  const handleAdjustDailyNewWords = (delta: number) => {
    const newValue = Math.max(1, Math.min(
      UI_CONFIG.DAILY_NEW_WORDS_LIMIT,
      settings.dailyNewWords + delta
    ));
    saveSettings({ dailyNewWords: newValue });
  };

  return (
    <ScrollView style={styles.container}>
      {/* 外观 */}
      <Card style={styles.card}>
        <Card.Title title="🎨 外观" titleStyle={styles.cardTitle} />
        <Card.Content>
          <Text style={styles.settingLabel}>主题</Text>
          <View style={styles.themeRow}>
            {(['light', 'dark', 'system'] as const).map(mode => (
              <PaperButton
                key={mode}
                mode={settings.theme === mode ? 'contained' : 'outlined'}
                compact
                onPress={() => {
                  saveSettings({ theme: mode });
                  setThemeMode(mode);
                }}
                style={styles.themeBtn}
                icon={mode === 'light' ? 'white-balance-sunny' : mode === 'dark' ? 'weather-night' : 'theme-light-dark'}
              >
                {mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '跟随系统'}
              </PaperButton>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* 学习设置 */}
      <Card style={styles.card}>
        <Card.Title title="⚙️ 学习设置" titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>每日新词数量</Text>
            <View style={styles.numberInput}>
              <View style={styles.stepperRow}>
                <PaperButton
                  mode="outlined"
                  compact
                  onPress={() => handleAdjustDailyNewWords(-1)}
                  style={styles.stepperBtn}
                  labelStyle={styles.stepperBtnLabel}
                >
                  -
                </PaperButton>
                <Surface style={styles.numberButton}>
                  <Text style={styles.numberText}>{settings.dailyNewWords}</Text>
                </Surface>
                <PaperButton
                  mode="outlined"
                  compact
                  onPress={() => handleAdjustDailyNewWords(1)}
                  style={styles.stepperBtn}
                  labelStyle={styles.stepperBtnLabel}
                >
                  +
                </PaperButton>
              </View>
            </View>
            <View style={styles.sliderContainer}>
              <View
                style={[
                  styles.sliderFill,
                  { width: `${(settings.dailyNewWords / UI_CONFIG.DAILY_NEW_WORDS_LIMIT) * 100}%` }
                ]}
              />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>1</Text>
              <Text style={styles.sliderLabel}>{UI_CONFIG.DAILY_NEW_WORDS_LIMIT}</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>🔊 发音功能</Text>
              <Text style={styles.toggleSublabel}>朗读单词发音</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={value => saveSettings({ soundEnabled: value })}
              color={colors.primary}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>🔇 熟词僻义</Text>
              <Text style={styles.toggleSublabel}>显示特殊用法标注</Text>
            </View>
            <Switch
              value={settings.showRareSense}
              onValueChange={value => saveSettings({ showRareSense: value })}
              color={colors.primary}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>🔍 词根词缀</Text>
              <Text style={styles.toggleSublabel}>显示词源分析</Text>
            </View>
            <Switch
              value={settings.showEtymology}
              onValueChange={value => saveSettings({ showEtymology: value })}
              color={colors.primary}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, !settings.soundEnabled && styles.disabledText]}>
                🔊 自动发音
              </Text>
              <Text style={styles.toggleSublabel}>
                {settings.soundEnabled ? '学新单词时自动朗读' : '需先开启发音功能'}
              </Text>
            </View>
            <Switch
              value={settings.soundEnabled && settings.autoPlaySound}
              onValueChange={value => saveSettings({ autoPlaySound: value })}
              color={colors.primary}
              disabled={!settings.soundEnabled}
            />
          </View>
        </Card.Content>
      </Card>

      {/* 数据管理 */}
      <Card style={styles.card}>
        <Card.Title title="📦 数据管理" titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.dataActions}>
            <View style={styles.dataActionItem}>
              <PaperButton
                mode="contained-tonal"
                icon="export"
                onPress={handleExport}
                loading={isExporting}
                disabled={isExporting || isImporting}
                style={[styles.dataActionBtn, { backgroundColor: colors.successContainer }]}
                labelStyle={styles.dataActionText}
              >
                导出备份
              </PaperButton>
              <Text style={styles.dataActionDesc}>导出 .bk 压缩备份</Text>
            </View>
            <View style={styles.dataActionItem}>
              <PaperButton
                mode="contained-tonal"
                icon="import"
                onPress={handleImport}
                loading={isImporting}
                disabled={isExporting || isImporting}
                style={[styles.dataActionBtn, { backgroundColor: colors.secondaryContainer }]}
                labelStyle={styles.dataActionText}
              >
                导入备份
              </PaperButton>
              <Text style={styles.dataActionDesc}>从 .bk 文件恢复数据</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 高级设置 */}
      <Card style={styles.card}>
        <Card.Title title="⚡ 高级选项" titleStyle={styles.cardTitle} />
        <Card.Content>
          <View style={styles.dangerActions}>
            <Surface style={[styles.dangerBtn, { backgroundColor: colors.errorContainer }]}>
              <Text style={styles.dangerBtnText} onPress={handleResetDefaults}>
                重置所有设置
              </Text>
            </Surface>
            <Surface style={[styles.dangerBtn, { backgroundColor: colors.errorContainer }]}>
              <Text style={[styles.dangerBtnText, { color: colors.danger }]} onPress={handleClearData}>
                清除所有数据
              </Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>

      {/* 版本信息 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>版本 1.0.0（离线精简版）</Text>
        <Text style={styles.footerSub}>考研英语生词本</Text>
        <Text style={styles.footerSub}>专注考研 · 科学背词 · 纯本地运行</Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingGroup: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.onSurface,
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
  },
  numberInput: {
    alignItems: 'center',
    marginBottom: 8,
  },
  numberButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
  },
  numberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  sliderContainer: {
    height: 8,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.tertiary,
  },
  divider: {
    marginVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleSublabel: {
    fontSize: 12,
    color: colors.tertiary,
    marginTop: 2,
  },
  disabledText: {
    color: colors.tertiary,
  },
  dataActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dataActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  dataActionBtn: {
    borderRadius: 8,
    width: '100%',
  },
  dataActionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dataActionDesc: {
    fontSize: 12,
    color: colors.tertiary,
    marginTop: 4,
  },
  dangerActions: {
    gap: 12,
  },
  dangerBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.tertiary,
  },
  footerSub: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  stepperBtn: {
    borderRadius: 8,
    minWidth: 40,
  },
  stepperBtnLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
}));
