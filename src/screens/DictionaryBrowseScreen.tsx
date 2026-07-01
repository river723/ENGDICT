// src/screens/DictionaryBrowseScreen.tsx
//
// 词库浏览/查询页（栈屏）。
// 展示所选词库的全部单词，支持按单词或释义搜索；
// 点行进入 DictionaryWordDetail 查看只读详情。
// 数据源复用 wordUtils.getLocalWordDictWords()。

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Card, Text, TextInput } from 'react-native-paper';
import { useAppNavigation, useAppRoute } from '../navigation/types';
import { getLocalWordDictWords } from '../utils/wordUtils';
import { Word } from '../types';
import { getDictionaryById } from '../data/dictionaries';
import { makeStyles } from '../utils/useStyles';
import { difficultyColor } from '../theme/tokens';

type DictEntry = Omit<Word, 'id' | 'created_at' | 'updated_at'>;

const ROW_HEIGHT = 64;

// -----------------------------------------------------------------------
// 子级行组件（React.memo 隔离渲染）

interface WordRowProps {
  entry: DictEntry;
  onPress: (word: string) => void;
}

const WordRow = React.memo(function WordRow({ entry, onPress }: WordRowProps) {
  const styles = useRowStyles();
  const diff = entry.difficulty;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(entry.word)}
      style={styles.row}
    >
      <View style={styles.infoCol}>
        <Text style={styles.word}>{entry.word}</Text>
        <Text style={styles.meaning} numberOfLines={1}>
          {entry.definitions[0]?.meaning || '暂无释义'}
        </Text>
      </View>
      {/* 难度色为语义常量，不随主题变 */}
      <Text style={[styles.diffBadge, { color: difficultyColor(diff) }]}>
        {'★'.repeat(diff)}{'☆'.repeat(5 - diff)}
      </Text>
    </TouchableOpacity>
  );
});

const useRowStyles = makeStyles((colors) => ({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    elevation: 1,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  word: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 2,
  },
  meaning: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  diffBadge: {
    fontSize: 11,
    lineHeight: 14,
  },
}));

// -----------------------------------------------------------------------
// 主页面

export default function DictionaryBrowseScreen() {
  const route = useAppRoute<'DictionaryBrowse'>();
  const navigation = useAppNavigation();
  const styles = useStyles();

  const dict = getDictionaryById(route.params.dictId);

  // 全量数据（字母序）。useState 惰性初始化，避免每次 render 重建。
  const [list] = useState<DictEntry[]>(() => getLocalWordDictWords());

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // 筛选 + 排序：startsWith 优先，再按字母序
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return list;

    const matched = list.filter(
      (e) =>
        e.word.toLowerCase().includes(q) ||
        (e.definitions[0]?.meaning || '').toLowerCase().includes(q)
    );

    return matched.slice().sort((a, b) => {
      const aStarts = a.word.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.word.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    });
  }, [list, debouncedQuery]);

  const openDetail = useCallback(
    (word: string) => {
      navigation.navigate('DictionaryWordDetail', { word });
    },
    [navigation]
  );

  const keyExtractor = useCallback(
    (item: DictEntry) => item.word.toLowerCase(),
    []
  );

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const renderRow = useCallback(
    ({ item }: { item: DictEntry }) => (
      <WordRow entry={item} onPress={openDetail} />
    ),
    [openDetail]
  );

  if (!dict) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>未找到该词库</Text>
      </View>
    );
  }

  const total = list.length;
  const shown = filtered.length;
  const isSearching = debouncedQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen}>
      {/* 状态栏 */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {dict.name} · 共 {total.toLocaleString()} 词
        </Text>
        {isSearching && (
          <Text style={styles.statusHit}> · 命中 {shown.toLocaleString()}</Text>
        )}
      </View>

      {/* 搜索框 */}
      <Card style={styles.searchCard}>
        <TextInput
          mode="flat"
          placeholder="输入单词或释义查询..."
          value={query}
          onChangeText={setQuery}
          left={<TextInput.Icon icon="magnify" />}
          clearButtonMode="while-editing"
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </Card>

      {/* 单词列表 */}
      <FlatList
        data={filtered}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={20}
        windowSize={9}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>没有找到匹配的单词</Text>
            <Text style={styles.emptyHint}>试试其他搜索词</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------
// 主题化样式

const useStyles = makeStyles((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 8 : 4,
    paddingBottom: 6,
  },
  statusText: { fontSize: 13, color: colors.onSurfaceVariant },
  statusHit: { fontSize: 13, color: colors.primary },

  searchCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },

  list: {
    flex: 1,
    paddingHorizontal: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.tertiary,
    marginTop: 4,
  },
}));
