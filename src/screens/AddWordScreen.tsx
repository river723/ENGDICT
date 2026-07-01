import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Text,
  Chip,
  Surface,
  Dialog,
  Portal,
  SegmentedButtons
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppNavigation } from '../navigation/types';
import { makeStyles } from '../utils/useStyles';
import { useAppTheme } from '../theme/theme';
import { palette } from '../theme/tokens';
import StorageService from '../services/StorageService';
import { Word, WordDictEntry } from '../types';
import { getLocalWordDictResult, wordDictEntryToWord } from '../utils/wordUtils';
import DifficultyDots from '../components/DifficultyDots';

type AddWordTab = 'wordbank' | 'manual';

export default function AddWordScreen() {
  const navigation = useAppNavigation();
  const { colors } = useAppTheme();
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<AddWordTab>('wordbank');
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Map<string, WordDictEntry> | WordDictEntry | null>(null);
  const [pronunciation, setPronunciation] = useState('');
  const [customDefinitions, setCustomDefinitions] = useState('');
  const [parsedWords, setParsedWords] = useState<string[]>([]);

  // 覆盖确认 Dialog 状态
  const [overwriteDialog, setOverwriteDialog] = useState<{
    visible: boolean;
    word: string;
    existing: Word | null;
    entry: WordDictEntry | null;
  }>({ visible: false, word: '', existing: null, entry: null });

  // 解析输入的单词
  const parseWords = (text: string): string[] => {
    if (!text.trim()) return [];

    const words = text
      .split(/[\s\n,，。；;：:、\-]/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));

    const uniqueWords = [...new Set(words)];
    return uniqueWords;
  };

  // 分析单词（仅本地词库）
  const analyzeWords = async () => {
    const words = parseWords(input);
    setParsedWords(words);

    if (words.length === 0) {
      Alert.alert('提示', '请输入有效的单词');
      return;
    }

    if (words.length > 30) {
      Alert.alert('提示', '一次最多只能处理30个单词');
      return;
    }

    setAnalysisResult(null);
    setIsAnalyzing(true);
    try {
      const resultMap = new Map<string, WordDictEntry>();
      const missingWords: string[] = [];

      words.forEach(word => {
        const localResult = getLocalWordDictResult(word);
        if (localResult) {
          resultMap.set(word, localResult);
        } else {
          missingWords.push(word);
        }
      });

      if (missingWords.length > 0 && resultMap.size > 0) {
        Alert.alert(
          '部分单词已从本地词库找到',
          `${resultMap.size} 个单词可直接保存，${missingWords.length} 个未在本地词库中找到，保存时会跳过。`
        );
      } else if (missingWords.length > 0 && resultMap.size === 0) {
        Alert.alert('提示', '未在本地词库找到这些单词，可手动填写释义后保存。');
      }

      if (words.length === 1) {
        setAnalysisResult(resultMap.get(words[0]) || null);
      } else {
        setAnalysisResult(resultMap);
      }
    } catch (error: any) {
      console.error('分析失败:', error);
      Alert.alert('错误', '本地词库查询失败');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 判断是否为单个单词结果
  const isSingleWordResult = (): boolean => {
    if (!analysisResult) return false;
    return !(analysisResult instanceof Map);
  };

  // 获取难度等级
  const getEntryDifficulty = (entry: WordDictEntry | null | undefined): number => {
    const raw = entry?.suggestedDifficulty;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return 3;
    return Math.max(1, Math.min(5, Math.round(raw)));
  };

  const getDifficultyLabel = (difficulty: number): string => {
    return difficulty <= 2 ? '简单' : difficulty <= 3 ? '中等' : difficulty <= 4 ? '困难' : '极难';
  };

  const canSave = (): boolean => {
    if (parsedWords.length === 0) return false;
    return parsedWords.some(word => getAnalysisFor(word));
  };

  // 获取单词的分析结果
  const getAnalysisFor = (word: string): WordDictEntry | null => {
    if (analysisResult instanceof Map) {
      return analysisResult.get(word) || null;
    }
    if (analysisResult && parsedWords.length === 1 && parsedWords[0] === word) {
      return analysisResult as WordDictEntry;
    }
    // 手动释义路径
    if (!analysisResult && parsedWords.length === 1 && parsedWords[0] === word && customDefinitions.trim()) {
      return {
        definitions: [{
          part_of_speech: 'unknown',
          meaning: customDefinitions.trim(),
          example: '',
          is_core: false,
          is_rare_sense: false
        }],
        etymology: '',
        similar_words: [],
        suggestedDifficulty: 3
      };
    }
    return null;
  };

  const getSavableCount = (): number => parsedWords.filter(word => getAnalysisFor(word)).length;

  const renderSuggestedDifficulty = (entry: WordDictEntry, compact = false) => {
    const difficulty = getEntryDifficulty(entry);

    return (
      <View style={compact ? styles.difficultyInlineCompact : styles.difficultyInline}>
        <Text style={styles.difficultyInlineLabel}>难度</Text>
        <DifficultyDots difficulty={difficulty} style={styles.difficultyDots} />
        <Text style={styles.difficultyText}>{getDifficultyLabel(difficulty)}</Text>
      </View>
    );
  };

  const renderAnalysisSummaryItem = (word: string, entry: WordDictEntry) => (
    <Surface key={word} style={styles.batchWordItem}>
      <View style={styles.batchWordHeader}>
        <Text style={styles.batchWordTitle}>{word}</Text>
        {renderSuggestedDifficulty(entry, true)}
      </View>
      {entry.definitions && entry.definitions.length > 0 ? (
        entry.definitions.slice(0, 2).map((def, index) => (
          <View key={index} style={styles.batchDefinition}>
            <Text style={styles.batchPartOfSpeech}>{def.part_of_speech}</Text>
            <Text style={styles.batchMeaning}>{def.meaning}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.batchNoAnalysis}>暂无释义</Text>
      )}
    </Surface>
  );

  // 清空表单
  const resetForm = () => {
    setInput('');
    setParsedWords([]);
    setAnalysisResult(null);
    setPronunciation('');
    setCustomDefinitions('');
  };

  // 覆盖既有单词
  const overwriteExisting = async (existing: Word, entry: WordDictEntry) => {
    try {
      const converted = wordDictEntryToWord(existing.word, entry);
      const updates: Partial<Word> = {
        definitions: converted.definitions,
        etymology: converted.etymology,
        similar_words: converted.similar_words || [],
        difficulty: converted.difficulty,
        ...(pronunciation
          ? { pronunciation_uk: pronunciation, pronunciation_us: pronunciation }
          : {}),
      };
      await StorageService.updateWord(existing.id!, updates);

      const wordText = existing.word;
      resetForm();
      Alert.alert(
        '覆盖成功 ✏️',
        `已用最新内容覆盖单词「${wordText}」`,
        [
          { text: '继续添加' },
          { text: '返回首页', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error: any) {
      Alert.alert('错误', `覆盖失败，请重试: ${error.message}`);
    }
  };

  // 保存单词
  const saveWords = async () => {
    if (!canSave() || parsedWords.length === 0) {
      Alert.alert('提示', '请先查询本地词库或手动填写释义');
      return;
    }

    // 单个单词：若已存在，弹覆盖确认
    if (parsedWords.length === 1) {
      const word = parsedWords[0];
      const existingWords = await StorageService.getWords();
      const existing = existingWords.find(
        w => (w.word || '').trim().toLowerCase() === word.trim().toLowerCase()
      );
      if (existing) {
        const entry = getAnalysisFor(word);
        if (!entry) {
          Alert.alert('提示', '请先查询本地词库或手动填写释义');
          return;
        }
        setOverwriteDialog({ visible: true, word, existing, entry });
        return;
      }
    }

    try {
      let successCount = 0;
      let failCount = 0;
      let duplicateCount = 0;
      let skippedCount = 0;

      const existingWords = await StorageService.getWords();
      const existingWordSet = new Set(existingWords.map(w => w.word.toLowerCase()));

      for (const word of parsedWords) {
        if (existingWordSet.has(word.toLowerCase())) {
          duplicateCount++;
          continue;
        }

        try {
          const entry = getAnalysisFor(word);
          if (!entry) {
            skippedCount++;
            continue;
          }

          const converted = wordDictEntryToWord(word, entry);
          const difficulty = getEntryDifficulty(entry);

          const wordData: Omit<Word, 'id'> = {
            word,
            pronunciation_uk: pronunciation || undefined,
            pronunciation_us: pronunciation || undefined,
            definitions: converted.definitions,
            etymology: converted.etymology || '',
            similar_words: converted.similar_words || [],
            difficulty,
            frequency: 1
          };

          await StorageService.addWord(wordData);
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      const message = `成功保存 ${successCount} 个单词${failCount > 0 ? `，失败 ${failCount} 个` : ''}${duplicateCount > 0 ? `，已有 ${duplicateCount} 个` : ''}${skippedCount > 0 ? `，未查询跳过 ${skippedCount} 个` : ''}`;

      resetForm();

      Alert.alert(
        '保存成功 ✅',
        message,
        [
          { text: '继续添加' },
          { text: '返回首页', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error: any) {
      Alert.alert('错误', `保存失败，请重试: ${error.message}`);
    }
  };

  const wordCount = parsedWords.length;
  const savableCount = getSavableCount();

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageSubtitle}>从本地增强词库快速选择，或手工录入并用本地词库补全释义</Text>
      </View>

      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AddWordTab)}
        buttons={[
          { value: 'wordbank', label: '从本地词库选词', icon: 'book-search' },
          { value: 'manual', label: '手工添加新单词', icon: 'pencil-plus' },
        ]}
        style={styles.tabButtons}
      />

      {activeTab === 'wordbank' && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.pickerEntryRow}>
              <MaterialIcons name="library-books" size={40} color={colors.primary} />
              <View style={styles.pickerEntryText}>
                <Text style={styles.pickerEntryTitle}>从本地词库选词</Text>
                <Text style={styles.pickerEntryHint}>4801 个考研词，已含词根、例句和易混词，勾选即可加入生词本</Text>
              </View>
            </View>
            <Button
              mode="contained"
              icon="book-search"
              onPress={() => navigation.navigate('WordbankPicker')}
              style={styles.pickerEntryButton}
            >
              打开本地词库
            </Button>
          </Card.Content>
        </Card>
      )}

      {activeTab === 'manual' && (
        <Card style={styles.card}>
          <Card.Title title="手工添加新单词" titleStyle={styles.cardTitle} />
          <Card.Content>
          {/* 单词输入 */}
          <Text style={styles.helperText}>输入1-30个单词，用空格、换行或标点符号分隔</Text>
          <TextInput
            label="输入英文单词"
            value={input}
            onChangeText={(text) => {
              setInput(text);
              const words = parseWords(text);
              setParsedWords(words);
              setAnalysisResult(null);
            }}
            mode="outlined"
            multiline
            numberOfLines={5}
            style={styles.input}
            placeholder="例如: abandon persist diligent&#10;或者: abandon,persist,diligent"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* 单词预览 */}
          {wordCount > 0 && (
            <Surface style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>解析结果</Text>
                <Chip
                  style={styles.wordCountChip}
                  textStyle={styles.chipText}
                >
                  {wordCount}个单词
                </Chip>
              </View>
              <Text style={styles.previewWords}>
                {parsedWords.join(', ')}
              </Text>
              {wordCount > 30 && (
                <Text style={styles.warningText}>超过30个限制，只会处理前30个</Text>
              )}
            </Surface>
          )}

          {/* 音标输入（仅单个单词时显示） */}
          {wordCount === 1 && (
            <TextInput
              label="音标 (可选)"
              value={pronunciation}
              onChangeText={setPronunciation}
              mode="outlined"
              style={styles.input}
              placeholder="例如: [əˈbændən]"
            />
          )}

          {/* 本地词库查询按钮 */}
          <Button
            mode="contained"
            onPress={analyzeWords}
            loading={isAnalyzing}
            disabled={isAnalyzing || wordCount === 0}
            style={styles.analyzeButton}
            icon="book-search"
          >
            {isAnalyzing ? '查询中...' : `本地词库查询 (${wordCount}个)`}
          </Button>
        </Card.Content>
      </Card>

      )}

      {activeTab === 'manual' && isAnalyzing && (
        <Card style={styles.card}>
          <Card.Content style={styles.loadingContainer}>
            <Text style={styles.loadingText}>正在查询本地词库...</Text>
          </Card.Content>
        </Card>
      )}

      {/* 分析结果 - 单个单词 */}
      {activeTab === 'manual' && analysisResult && isSingleWordResult() && (
        <Card style={styles.card}>
          <Card.Title title="本地词库命中" titleStyle={styles.cardTitle} />
          <Card.Content>
            {renderSuggestedDifficulty(analysisResult as WordDictEntry)}

            {/* 释义 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📚 考研释义</Text>
              {(analysisResult as WordDictEntry).definitions?.map((def, index) => (
                <Surface key={index} style={styles.definitionItem}>
                  <View style={styles.definitionHeader}>
                    <Text style={styles.partOfSpeech}>{def.part_of_speech}</Text>
                    {def.is_core && <Chip mode="flat" compact>核心</Chip>}
                    {def.is_rare_sense && <Chip mode="flat" compact>熟词僻义</Chip>}
                  </View>
                  <Text style={styles.meaning}>{def.meaning}</Text>
                  {def.example && (
                    <Text style={styles.example}>例句: {def.example}</Text>
                  )}
                </Surface>
              ))}
            </View>

            {/* 词根词缀 */}
            {(analysisResult as WordDictEntry).etymology && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔍 词根词缀</Text>
                <Surface style={styles.etymologyContainer}>
                  <Text style={styles.etymologyText}>{(analysisResult as WordDictEntry).etymology}</Text>
                </Surface>
              </View>
            )}

            {/* 形近词 */}
            {Array.isArray((analysisResult as WordDictEntry).similar_words) && (analysisResult as WordDictEntry).similar_words!.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ 易混词提醒</Text>
                {(analysisResult as WordDictEntry).similar_words!.map((similar, index) => (
                  <Surface key={index} style={styles.similarWordItem}>
                    <Text style={styles.similarWord}>
                      {similar.word} ({similar.relation}): {similar.description}
                    </Text>
                  </Surface>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* 分析结果 - 多个单词 */}
      {activeTab === 'manual' && analysisResult && analysisResult instanceof Map && (
        <Card style={styles.card}>
          <Card.Title title={`本地词库命中 (${(analysisResult as Map<string, WordDictEntry>).size}个单词)`} titleStyle={styles.cardTitle} />
          <Card.Content>
            {Array.from((analysisResult as Map<string, WordDictEntry>).entries()).map(([word, entry]) =>
              renderAnalysisSummaryItem(word, entry)
            )}
          </Card.Content>
        </Card>
      )}

      {/* 手动添加释义（仅单个单词且无分析时显示） */}
      {activeTab === 'manual' && wordCount === 1 && !analysisResult && (
        <Card style={styles.card}>
          <Card.Title title="手动添加释义" titleStyle={styles.cardTitle} />
          <Card.Content>
            <TextInput
              label="单词释义"
              value={customDefinitions}
              onChangeText={setCustomDefinitions}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="请输入单词的中文释义、例句等..."
              style={styles.textArea}
            />
          </Card.Content>
        </Card>
      )}

      {/* 保存按钮 */}
      {activeTab === 'manual' && (
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={saveWords}
          disabled={!canSave()}
          style={styles.saveButton}
          icon="content-save"
        >
          保存 ({savableCount}/{wordCount}个单词)
        </Button>
      </View>
      )}
    </ScrollView>

    {/* 覆盖确认 Dialog */}
    <Portal>
      <Dialog
        visible={overwriteDialog.visible}
        onDismiss={() => setOverwriteDialog({ visible: false, word: '', existing: null, entry: null })}
      >
        <Dialog.Title>单词已存在</Dialog.Title>
        <Dialog.Content>
          <Text style={{ lineHeight: 20 }}>
            「{overwriteDialog.word}」已在生词本中，是否用最新内容覆盖？{'\n'}
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
              覆盖会更新释义、词根、形近词、难度、音标，不影响学习记录。
            </Text>
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => setOverwriteDialog({ visible: false, word: '', existing: null, entry: null })}
          >
            取消
          </Button>
          <Button
            mode="contained"
            buttonColor={palette.danger}
            textColor="#fff"
            onPress={() => {
              const { existing, entry } = overwriteDialog;
              setOverwriteDialog({ visible: false, word: '', existing: null, entry: null });
              if (existing && entry) {
                overwriteExisting(existing, entry);
              }
            }}
          >
            覆盖
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
    </>
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
  pageHeader: {
    marginBottom: 16,
  },
  pageSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  tabButtons: {
    marginBottom: 16,
  },
  pickerEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerEntryText: {
    flex: 1,
    marginLeft: 12,
  },
  pickerEntryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  pickerEntryHint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  pickerEntryButton: {
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  previewContainer: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 1,
    backgroundColor: colors.primaryContainer,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  wordCountChip: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.onPrimaryContainer,
    fontSize: 12,
  },
  previewWords: {
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 18,
  },
  warningText: {
    fontSize: 11,
    color: palette.danger,
    marginTop: 8,
    fontStyle: 'italic',
  },
  analyzeButton: {
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  definitionItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  definitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partOfSpeech: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginRight: 8,
  },
  meaning: {
    fontSize: 14,
    color: colors.onSurface,
  },
  example: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    fontStyle: 'italic',
  },
  etymologyContainer: {
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  etymologyText: {
    fontSize: 14,
    color: colors.onSurface,
  },
  similarWordItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  similarWord: {
    fontSize: 14,
    color: colors.onSurface,
  },
  textArea: {
    marginBottom: 16,
  },
  difficultyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: palette.accentLight,
    marginBottom: 12,
  },
  difficultyInlineCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: palette.accentLight,
  },
  difficultyInlineLabel: {
    fontSize: 12,
    color: '#795548',
    marginRight: 6,
    fontWeight: '600',
  },
  difficultyDots: {
    flexDirection: 'row',
    marginHorizontal: 8,
  },
  difficultyText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    minWidth: 50,
    textAlign: 'right',
  },
  buttonContainer: {
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 8,
  },
  batchWordItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  batchWordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  batchWordTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  batchDefinition: {
    marginBottom: 4,
  },
  batchPartOfSpeech: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  batchMeaning: {
    fontSize: 14,
    color: colors.onSurface,
  },
  batchNoAnalysis: {
    fontSize: 14,
    color: colors.tertiary,
    fontStyle: 'italic',
  },
}));
