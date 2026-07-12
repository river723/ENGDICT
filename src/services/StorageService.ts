import { Word, StudyRecord, StudyPlan, AppSettings } from '../types';

// 跨平台存储接口
interface StorageInterface {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

// 根据平台选择存储实现
let AsyncStorage: StorageInterface;

if (typeof window !== 'undefined') {
  // Web环境或React Native环境
  const RNAsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage = RNAsyncStorage.default || RNAsyncStorage;
} else {
  // Node.js环境 - 使用内存存储进行测试
  console.log('StorageService: Node.js环境检测 - 使用内存存储');

  const memoryStorage = new Map<string, string>();

  AsyncStorage = {
    getItem: async (key: string) => {
      return memoryStorage.get(key) || null;
    },
    setItem: async (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: async (key: string) => {
      memoryStorage.delete(key);
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach(key => memoryStorage.delete(key));
    }
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  dailyNewWords: 10,
  reviewInterval: [1, 2, 4, 7, 15],
  soundEnabled: true,
  autoPlaySound: false,
  theme: 'light',
  fontSize: 14,
  showRareSense: true,
  showEtymology: true,
};

class StorageService {
  private static instance: StorageService;

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // 存储键名
  private readonly KEYS = {
    WORDS: 'kaoyan_words',
    STUDY_RECORDS: 'kaoyan_study_records',
    STUDY_PLANS: 'kaoyan_study_plans',
    SETTINGS: 'kaoyan_settings',
    IGNORED_WORDBANK_WORDS: 'kaoyan_ignored_wordbank_words',
    SCREEN_FILTERS: 'kaoyan_screen_filters'
  };

  // 生词操作
  async addWord(word: Omit<Word, 'id'>): Promise<number> {
    const words = await this.getWords();
    const newId = words.length > 0 ? Math.max(...words.map(w => w.id!)) + 1 : 1;

    const newWord: Word = {
      ...word,
      id: newId,
      similar_words: Array.isArray(word.similar_words) ? word.similar_words : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    words.push(newWord);
    await AsyncStorage.setItem(this.KEYS.WORDS, JSON.stringify(words));
    return newId;
  }

  async getWords(): Promise<Word[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.WORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get words error:', error);
      return [];
    }
  }

  async getWordById(id: number): Promise<Word | null> {
    const words = await this.getWords();
    return words.find(word => word.id === id) || null;
  }

  async searchWords(query: string): Promise<Word[]> {
    const words = await this.getWords();
    return words.filter(word =>
      word.word.toLowerCase().includes(query.toLowerCase())
    );
  }

  async updateWord(id: number, updates: Partial<Word>): Promise<void> {
    const words = await this.getWords();
    const index = words.findIndex(word => word.id === id);

    if (index !== -1) {
      words[index] = {
        ...words[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      await AsyncStorage.setItem(this.KEYS.WORDS, JSON.stringify(words));
    }
  }

  async deleteWord(id: number): Promise<void> {
    const words = await this.getWords();
    const filtered = words.filter(word => word.id !== id);
    await AsyncStorage.setItem(this.KEYS.WORDS, JSON.stringify(filtered));
  }

  // 词库忽略词操作
  async getIgnoredWordbankWords(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.IGNORED_WORDBANK_WORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get ignored wordbank words error:', error);
      return [];
    }
  }

  async addIgnoredWordbankWords(words: string[]): Promise<void> {
    const current = await this.getIgnoredWordbankWords();
    const next = new Set(current.map(word => word.toLowerCase()));
    words.forEach(word => next.add(word.toLowerCase()));
    await AsyncStorage.setItem(
      this.KEYS.IGNORED_WORDBANK_WORDS,
      JSON.stringify(Array.from(next))
    );
  }

  async clearIgnoredWordbankWords(): Promise<void> {
    await AsyncStorage.removeItem(this.KEYS.IGNORED_WORDBANK_WORDS);
  }

  // 各页面筛选/排序偏好（按页面名分区存于同一 key）
  private async getAllScreenFilters(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.SCREEN_FILTERS);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Get screen filters error:', error);
      return {};
    }
  }

  async getScreenFilters<T>(screen: string): Promise<Partial<T>> {
    const all = await this.getAllScreenFilters();
    return (all[screen] as Partial<T>) || {};
  }

  async saveScreenFilters<T extends object>(
    screen: string,
    prefs: T
  ): Promise<void> {
    const all = await this.getAllScreenFilters();
    all[screen] = prefs;
    await AsyncStorage.setItem(
      this.KEYS.SCREEN_FILTERS,
      JSON.stringify(all)
    );
  }

  // 学习记录操作
  async addStudyRecord(record: Omit<StudyRecord, 'id'>): Promise<void> {
    const records = await this.getStudyRecords();
    const newId = records.length > 0 ? Math.max(...records.map(r => r.id!)) + 1 : 1;

    const newRecord: StudyRecord = {
      ...record,
      id: newId
    };

    records.push(newRecord);
    await AsyncStorage.setItem(this.KEYS.STUDY_RECORDS, JSON.stringify(records));
  }

  async getStudyRecords(): Promise<StudyRecord[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.STUDY_RECORDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get study records error:', error);
      return [];
    }
  }

  async getStudyRecordsByDate(date: string): Promise<StudyRecord[]> {
    const records = await this.getStudyRecords();
    return records.filter(record => record.study_date === date);
  }

  // 学习计划操作
  async addStudyPlan(plan: Omit<StudyPlan, 'id'>): Promise<void> {
    const plans = await this.getStudyPlans();
    const newId = plans.length > 0 ? Math.max(...plans.map(p => p.id!)) + 1 : 1;

    const newPlan: StudyPlan = {
      ...plan,
      id: newId
    };

    plans.push(newPlan);
    await AsyncStorage.setItem(this.KEYS.STUDY_PLANS, JSON.stringify(plans));
  }

  async getStudyPlans(): Promise<StudyPlan[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.STUDY_PLANS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get study plans error:', error);
      return [];
    }
  }

  async getTodayStudyPlan(): Promise<StudyPlan[]> {
    const today = new Date().toISOString().split('T')[0];
    const plans = await this.getStudyPlans();
    return plans.filter(plan =>
      plan.plan_date === today && !plan.completed
    );
  }

  async completeStudyPlan(planId: number): Promise<void> {
    const plans = await this.getStudyPlans();
    const index = plans.findIndex(plan => plan.id === planId);

    if (index !== -1) {
      plans[index].completed = true;
      await AsyncStorage.setItem(this.KEYS.STUDY_PLANS, JSON.stringify(plans));
    }
  }

  // 设置操作
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.SETTINGS);
      const parsed = data ? JSON.parse(data) : {};
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      console.error('Get settings error:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.getSettings();
    const next = { ...current, ...settings };
    await AsyncStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(next));
  }

  // 重置设置为默认值（整体覆盖，非合并）
  async resetSettings(): Promise<void> {
    await AsyncStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  }

  // 数据导入导出
  async exportData(): Promise<string> {
    const settings = await this.getSettings();
    const data = {
      appName: 'memo-grad',
      schemaVersion: 1,
      words: await this.getWords(),
      studyRecords: await this.getStudyRecords(),
      studyPlans: await this.getStudyPlans(),
      ignoredWordbankWords: await this.getIgnoredWordbankWords(),
      settings,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      if (data.words) {
        await AsyncStorage.setItem(this.KEYS.WORDS, JSON.stringify(data.words));
      }
      if (data.studyRecords) {
        await AsyncStorage.setItem(this.KEYS.STUDY_RECORDS, JSON.stringify(data.studyRecords));
      }
      if (data.studyPlans) {
        await AsyncStorage.setItem(this.KEYS.STUDY_PLANS, JSON.stringify(data.studyPlans));
      }
      if (data.settings) {
        await this.saveSettings(data.settings);
      }
      if (data.ignoredWordbankWords) {
        await AsyncStorage.setItem(
          this.KEYS.IGNORED_WORDBANK_WORDS,
          JSON.stringify(data.ignoredWordbankWords)
        );
      }
    } catch (error) {
      console.error('Import data error:', error);
      throw new Error('数据导入失败');
    }
  }

  // 清空所有数据
  async clearAllData(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.KEYS.WORDS,
      this.KEYS.STUDY_RECORDS,
      this.KEYS.STUDY_PLANS,
      this.KEYS.IGNORED_WORDBANK_WORDS,
      this.KEYS.SETTINGS,
      this.KEYS.SCREEN_FILTERS
    ]);
  }
}

export default StorageService.getInstance();
