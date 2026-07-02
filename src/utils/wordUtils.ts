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
    frequency: clampDifficulty(entry.examFrequency),
  };
}

/** 本地增强词典的候选列表，供选词页直接使用。 */
export function getLocalWordDictWords(): Omit<Word, 'id' | 'created_at' | 'updated_at'>[] {
  return Object.entries(worddict.results).map(([word, entry]) =>
    wordDictEntryToWord(word, entry)
  );
}

/**
 * 基于 seed 的确定性洗牌（Fisher–Yates + mulberry32 伪随机）。
 *
 * 同一 seed → 同样的顺序，因此跨 render / 分组翻页都稳定，
 * 不会像直接 Math.random() 那样每次重渲染都跳动。
 * 想「再洗一次」时换一个新 seed 即可。
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = items.slice();
  let s = seed >>> 0;
  const rand = () => {
    // mulberry32
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

