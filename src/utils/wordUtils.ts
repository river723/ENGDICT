import { Word, AppSettings, WordDictEntry, WordDictJson } from '../types';
import worddictJson from '../data/worddict.json';

const worddict = worddictJson as WordDictJson;

function clampDifficulty(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 3;
  return Math.max(1, Math.min(5, Math.round(value)));
}

/** 从本地增强词典读取单词分析结果。 */
export function getLocalWordDictResult(word: string): WordDictEntry | null {
  const key = word.trim().toLowerCase();
  return worddict.results[key] || null;
}

/** 把 worddict 的对象映射词条转换成应用内 Word 结构。 */
export function wordDictEntryToWord(
  word: string,
  entry: WordDictEntry
): Omit<Word, 'id' | 'created_at' | 'updated_at'> {
  return {
    word,
    definitions: entry.definitions,
    etymology: entry.etymology,
    similar_words: Array.isArray(entry.similar_words) ? entry.similar_words : [],
    difficulty: clampDifficulty(entry.suggestedDifficulty),
    frequency: 2,
  };
}

/** 本地增强词典的候选列表，供选词页直接使用。 */
export function getLocalWordDictWords(): Omit<Word, 'id' | 'created_at' | 'updated_at'>[] {
  return Object.entries(worddict.results).map(([word, entry]) =>
    wordDictEntryToWord(word, entry)
  );
}
