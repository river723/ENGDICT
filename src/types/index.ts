export interface Word {
  id?: number;
  word: string;
  pronunciation_uk?: string;
  pronunciation_us?: string;
  definitions: WordDefinition[];
  etymology?: string;
  similar_words?: SimilarWord[];
  memoryTip?: string; // 记忆技巧（谐音、联想等）
  difficulty: number; // 1-5
  frequency: number; // 考研频次
  created_at?: string;
  updated_at?: string;
}

export interface WordDefinition {
  part_of_speech: string;
  meaning: string;
  example?: string;
  is_core?: boolean; // 是否为核心考研释义
  is_rare_sense?: boolean; // 是否为熟词僻义
}

export interface SimilarWord {
  word: string;
  relation: 'spelling' | 'meaning' | 'root';
  description: string;
}

export interface StudyRecord {
  id?: number;
  word_id: number;
  study_date: string;
  result: 0 | 1; // 0:错误, 1:正确
  study_mode: StudyMode;
}

export interface StudyPlan {
  id?: number;
  word_id: number;
  plan_date: string;
  plan_type: 'new' | 'review';
  completed: boolean;
}

export type StudyMode = 'flashcard' | 'listening' | 'quiz';

export interface AppSettings {
  dailyNewWords: number;
  reviewInterval: number[];
  soundEnabled: boolean;
  autoPlaySound: boolean;
  theme: 'light' | 'dark' | 'system';  // 支持浅色/深色/跟随系统三种模式
  fontSize: number;
  showRareSense: boolean;
  showEtymology: boolean;
}

export interface DailyStats {
  date: string;
  new_words: number;
  reviewed_words: number;
  correct_rate: number;
}

export interface WeeklyStudyTrend {
  date: string;
  dayLabel: string;
  studyCount: number;
  studiedWordCount: number;
  correctCount: number;
  accuracy: number | null;
  plannedCount: number;
  completedCount: number;
  completionRate: number | null;
}

export interface WordDictEntry {
  definitions: WordDefinition[];
  etymology?: string;
  similar_words?: SimilarWord[];
  memoryTip?: string;           // 记忆技巧（谐音、联想等）
  suggestedDifficulty?: number; // 本地词典建议难度 1-5
  examFrequency?: number;       // 考试考频 1-5（5 最高）
}

export interface WordDictJson {
  results: Record<string, WordDictEntry>;
}