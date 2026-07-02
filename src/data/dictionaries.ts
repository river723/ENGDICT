// src/data/dictionaries.ts
//
// 词库元数据注册表。未来新增词库只需往 DICTIONARIES 追加一项，
// 词库选择页与浏览页均以此为唯一数据源，避免硬编码。

import worddictJson from './worddict.json';
import type { WordDictJson } from '../types';

const worddict = worddictJson as WordDictJson;

/** 词库的静态描述信息。`wordCount` 由数据源动态计算，避免与实际数据脱节。 */
export interface DictMeta {
  id: string;
  name: string;
  description: string;
  /** 该词库包含的单词总数。 */
  wordCount: number;
}

/**
 * 当前可用的词库列表。目前仅内置考研英语词库（worddict.json）。
 */
export const DICTIONARIES: DictMeta[] = [
  {
    id: 'kaoyan',
    name: '考研英语词库(精简应试版)',
    description: '根据近20年真题剔除了超简单初高中基础词、极低频次出现的小众冷词、淘汰词汇，只保留真题有考察价值的词，内置增强词典，含词根词缀、例句、易混词与建议难度。',
    wordCount: Object.keys(worddict.results).length,
  },
];

/** 按 id 查找词库元数据。 */
export function getDictionaryById(id: string): DictMeta | undefined {
  return DICTIONARIES.find((d) => d.id === id);
}
