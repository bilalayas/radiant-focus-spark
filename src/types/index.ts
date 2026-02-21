export interface Task {
  id: string;
  name: string;
  category?: string;
  plannedDuration?: number; // minutes
  dates: string[]; // YYYY-MM-DD
  startHour?: number; // 0-24
}

export interface Session {
  id: string;
  taskId: string;
  taskName: string;
  date: string;
  duration: number; // seconds
  type: 'work' | 'break';
  timestamp: number;
}

export type ThemeMode = 'light' | 'dark';
export type ColorPalette = 'forest' | 'pink' | 'blue' | 'mono';
export type PlanningMode = 'timestamp' | 'list';

export interface AppSettings {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  notifications: boolean;
  defaultBreakDuration: number; // minutes
  planningHourStart: number; // 0-24
  planningHourEnd: number; // 0-24
  onboardingDone: boolean;
  useCase?: string;
  planningMode: PlanningMode;
}

export const defaultSettings: AppSettings = {
  themeMode: 'light',
  colorPalette: 'forest',
  notifications: true,
  defaultBreakDuration: 5,
  planningHourStart: 8,
  planningHourEnd: 20,
  onboardingDone: false,
  planningMode: 'timestamp',
};

export const paletteNames: Record<ColorPalette, string> = {
  forest: 'Forest',
  pink: 'Pastel Pink',
  blue: 'Steel Blue',
  mono: 'Monochrome',
};

// YKS Subjects
export const YKS_TYT_SUBJECTS = [
  'TYT Matematik',
  'TYT Türkçe',
  'TYT Fizik',
  'TYT Kimya',
  'TYT Biyoloji',
  'TYT Tarih',
  'TYT Coğrafya',
  'TYT Felsefe',
];

export const YKS_AYT_SUBJECTS = [
  'AYT Matematik',
  'AYT Fizik',
  'AYT Kimya',
  'AYT Biyoloji',
  'AYT Edebiyat',
  'AYT Tarih',
  'AYT Coğrafya',
];
