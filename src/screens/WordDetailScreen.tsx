import React, { useEffect, useState } from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { Text, Chip, Surface, Button, IconButton } from 'react-native-paper';
import { useAppNavigation, useAppRoute } from '../navigation/types';
import StorageService from '../services/StorageService';
import { Word } from '../types';
import { getLocalWordDictResult, wordDictEntryToWord } from '../utils/wordUtils';
import { makeStyles } from '../utils/useStyles';
import { difficultyColor } from '../theme/tokens';

// Web 平台兼容性处理
let Speech: any = null;
if (Platform.OS !== 'web') {
  try {
    Speech = require('expo-speech');
  } catch (error) {
    console.warn('expo-speech not available:', error);
  }
}

export default function WordDetailScreen() {
  const route = useAppRoute<'WordDetail'>();
  const navigation = useAppNavigation();
  const styles = useStyles();
  const [word, setWord] = useState<Word | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRareSense, setShowRareSense] = useState(true);
  const [showEtymology, setShowEtymology] = useState(true);
  const [showMemoryTip, setShowMemoryTip] = useState(true);

  useEffect(() => {
    const loadWord = async () => {
      const id = route.params?.wordId;
      if (!id) return;

      const [loadedWord, appSettings] = await Promise.all([
        StorageService.getWordById(id),
        StorageService.getSettings(),
      ]);
      setWord(loadedWord);
      setSoundEnabled(appSettings.soundEnabled !== false);
      setShowRareSense(appSettings.showRareSense !== false);
      setShowEtymology(appSettings.showEtymology !== false);
      setShowMemoryTip(appSettings.showMemoryTip !== false);
    };

    loadWord();
  }, [route.params]);

  // 本地词典补全：如果当前词缺少词根/例句/易混词，尝试从本地词典补全
  const enhanceFromLocalDict = async () => {
    if (!word || !word.id) return;
    const entry = getLocalWordDictResult(word.word);
    if (!entry) return;

    const converted = wordDictEntryToWord(word.word, entry);
    const updates: Partial<Word> = {
      definitions: converted.definitions,
      etymology: converted.etymology || word.etymology,
      similar_words: converted.similar_words || word.similar_words,
      memoryTip: converted.memoryTip || word.memoryTip,
      difficulty: converted.difficulty,
      frequency: converted.frequency,
    };
    await StorageService.updateWord(word.id, updates);
    setWord({ ...word, ...updates });
  };

  // 判断是否可从本地词典补全
  const hasEty = !!(word?.etymology && word.etymology.trim());
  const hasExample = (word?.definitions || []).some(d => d.example && d.example.trim());
  const hasSimilar = Array.isArray(word?.similar_words) && word.similar_words.length > 0;
  const hasMemoryTip = !!(word?.memoryTip && word.memoryTip.trim());
  const needsEnhancement = word && (!hasEty || !hasExample || !hasSimilar || !hasMemoryTip);
  const canEnhanceLocal = needsEnhancement && !!getLocalWordDictResult(word.word);

  const speakWord = (text: string) => {
    if (!soundEnabled) return;

    if (Speech && Platform.OS !== 'web') {
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
      });
    } else if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!word) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>未找到该单词</Text>
        <Button onPress={() => navigation.goBack()}>返回</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.card}>
        <View style={styles.wordHeader}>
          <View style={styles.wordInfo}>
            <Text style={styles.wordText}>{word.word}</Text>
            {word.pronunciation_uk && <Text style={styles.pronunciation}>UK {word.pronunciation_uk}</Text>}
            {word.pronunciation_us && <Text style={styles.pronunciation}>US {word.pronunciation_us}</Text>}
          </View>
          <IconButton
            icon={soundEnabled ? 'volume-high' : 'volume-off'}
            size={28}
            onPress={() => speakWord(word.word)}
            disabled={!soundEnabled}
          />
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaBadge, { color: difficultyColor(word.difficulty) }]}>
            难度 {'★'.repeat(word.difficulty)}{'☆'.repeat(5 - word.difficulty)}
          </Text>
          <Text style={styles.freqBadge}>
            考频 {'■'.repeat(word.frequency)}{'□'.repeat(5 - word.frequency)}
          </Text>
        </View>
      </Surface>

      <Surface style={styles.card}>
        <Text style={styles.sectionTitle}>释义</Text>
        {word.definitions.map((def, index) => (
          <Surface key={index} style={styles.definitionItem}>
            <View style={styles.definitionHeader}>
              <Text style={styles.definitionLabel}>{def.part_of_speech}</Text>
              {def.is_core && <Chip compact style={styles.chip}>核心</Chip>}
              {def.is_rare_sense && showRareSense && <Chip compact style={styles.chip}>熟词僻义</Chip>}
            </View>
            <Text style={styles.definitionMeaning}>{def.meaning}</Text>
            {def.example ? <Text style={styles.definitionExample}>例句：{def.example}</Text> : null}
          </Surface>
        ))}
      </Surface>

      {word.etymology && showEtymology ? (
        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>词根词缀</Text>
          <Text style={styles.sectionText}>{word.etymology}</Text>
        </Surface>
      ) : null}

      {word.memoryTip && showMemoryTip ? (
        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>记忆技巧</Text>
          <Text style={styles.sectionText}>{word.memoryTip}</Text>
        </Surface>
      ) : null}

      {Array.isArray(word.similar_words) && word.similar_words.length > 0 ? (
        <Surface style={styles.card}>
          <Text style={styles.sectionTitle}>易混词 / 相似词</Text>
          {word.similar_words.map((item, index) => (
            <View key={index} style={styles.similarItem}>
              <Text style={styles.similarWord}>{item.word} ({item.relation})</Text>
              <Text style={styles.similarDescription}>{item.description}</Text>
            </View>
          ))}
        </Surface>
      ) : null}

      {/* 本地词典补全按钮 */}
      {canEnhanceLocal ? (
        <Button
          mode="outlined"
          icon="book-search"
          onPress={enhanceFromLocalDict}
          style={styles.enhanceBtn}
        >
          本地词典补全词根、例句、近义词
        </Button>
      ) : null}

      <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
        返回
      </Button>
    </ScrollView>
  );
}

const useStyles = makeStyles(colors => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 16,
    color: colors.onSurfaceVariant,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  pronunciation: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaBadge: {
    fontSize: 12,
    lineHeight: 16,
  },
  freqBadge: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  definitionItem: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  definitionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  definitionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    color: colors.onSurface,
  },
  chip: {
    marginLeft: 8,
  },
  definitionMeaning: {
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 6,
  },
  definitionExample: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  sectionText: {
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 22,
  },
  similarItem: {
    marginBottom: 12,
  },
  similarWord: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  similarDescription: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  backButton: {
    marginTop: 16,
  },
  enhanceBtn: {
    marginBottom: 12,
    borderRadius: 8,
  },
}));
