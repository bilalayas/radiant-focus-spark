import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Task, Session, AppSettings, defaultSettings } from '@/types';

export interface TimerState {
  elapsed: number;
  isRunning: boolean;
  currentTaskId: string | null;
  currentTaskName: string | null;
  startTimestamp: number | null;
  start: (taskId: string, taskName: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => number;
  reset: () => void;
  formatTime: (secs: number) => string;
}

interface AppContextType {
  tasks: Task[];
  sessions: Session[];
  completions: Record<string, boolean>;
  settings: AppSettings;
  timer: TimerState;
  addTask: (task: Omit<Task, 'id'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTasksForDate: (date: string) => Task[];
  addTaskToDate: (taskId: string, date: string) => void;
  addSession: (session: Omit<Session, 'id'>) => void;
  getSessionsForDate: (date: string) => Session[];
  toggleTaskCompletion: (taskId: string, date: string) => void;
  isTaskCompleted: (taskId: string, date: string) => boolean;
  setTaskCompleted: (taskId: string, date: string, completed: boolean) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  clearAllData: () => void;
  exportData: () => string;
  taskExists: (name: string) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

function load<T>(key: string, def: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch {
    return def;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => load('app_tasks', []));
  const [sessions, setSessions] = useState<Session[]>(() => load('app_sessions', []));
  const [completions, setCompletions] = useState<Record<string, boolean>>(() => load('app_completions', {}));
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...defaultSettings, ...load('app_settings', defaultSettings) }));

  // Timer state - timestamp-based so it survives page refreshes
  const [timerRunning, setTimerRunning] = useState(() => load('timer_running', false));
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(() => load('timer_start_ts', null));
  const [timerAccumulated, setTimerAccumulated] = useState(() => load('timer_accumulated', 0));
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerTaskId, setTimerTaskId] = useState<string | null>(() => load('timer_task_id', null));
  const [timerTaskName, setTimerTaskName] = useState<string | null>(() => load('timer_task_name', null));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRunning && timerStartTimestamp) {
      const tick = () => {
        const now = Date.now();
        const elapsed = timerAccumulated + Math.floor((now - timerStartTimestamp) / 1000);
        setTimerElapsed(elapsed);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setTimerElapsed(timerAccumulated);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [timerRunning, timerStartTimestamp, timerAccumulated]);

  useEffect(() => {
    localStorage.setItem('timer_running', JSON.stringify(timerRunning));
    localStorage.setItem('timer_start_ts', JSON.stringify(timerStartTimestamp));
    localStorage.setItem('timer_accumulated', JSON.stringify(timerAccumulated));
    localStorage.setItem('timer_task_id', JSON.stringify(timerTaskId));
    localStorage.setItem('timer_task_name', JSON.stringify(timerTaskName));
  }, [timerRunning, timerStartTimestamp, timerAccumulated, timerTaskId, timerTaskName]);

  const timerStart = useCallback((taskId: string, taskName: string) => {
    setTimerTaskId(taskId);
    setTimerTaskName(taskName);
    setTimerAccumulated(0);
    setTimerStartTimestamp(Date.now());
    setTimerRunning(true);
  }, []);

  const timerPause = useCallback(() => {
    if (timerStartTimestamp) {
      const extra = Math.floor((Date.now() - timerStartTimestamp) / 1000);
      setTimerAccumulated(prev => prev + extra);
    }
    setTimerStartTimestamp(null);
    setTimerRunning(false);
  }, [timerStartTimestamp]);

  const timerResume = useCallback(() => {
    setTimerStartTimestamp(Date.now());
    setTimerRunning(true);
  }, []);

  const timerStop = useCallback(() => {
    let total = timerAccumulated;
    if (timerStartTimestamp) {
      total += Math.floor((Date.now() - timerStartTimestamp) / 1000);
    }
    setTimerRunning(false);
    setTimerStartTimestamp(null);
    setTimerAccumulated(0);
    return total;
  }, [timerAccumulated, timerStartTimestamp]);

  const timerReset = useCallback(() => {
    setTimerElapsed(0);
    setTimerRunning(false);
    setTimerStartTimestamp(null);
    setTimerAccumulated(0);
    setTimerTaskId(null);
    setTimerTaskName(null);
  }, []);

  const formatTime = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    if (m > 0) return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${s.toString().padStart(2, '0')}`;
  }, []);

  const timer: TimerState = {
    elapsed: timerElapsed,
    isRunning: timerRunning,
    currentTaskId: timerTaskId,
    currentTaskName: timerTaskName,
    startTimestamp: timerStartTimestamp,
    start: timerStart,
    pause: timerPause,
    resume: timerResume,
    stop: timerStop,
    reset: timerReset,
    formatTime,
  };

  useEffect(() => localStorage.setItem('app_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('app_sessions', JSON.stringify(sessions)), [sessions]);
  useEffect(() => localStorage.setItem('app_completions', JSON.stringify(completions)), [completions]);
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    const root = document.documentElement;
    root.classList.toggle('dark', settings.themeMode === 'dark');
    if (settings.colorPalette && settings.colorPalette !== 'forest') {
      root.setAttribute('data-palette', settings.colorPalette);
    } else {
      root.removeAttribute('data-palette');
    }
  }, [settings]);

  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const newTask = { ...task, id: crypto.randomUUID() };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTasksForDate = useCallback((date: string) => {
    return tasks.filter(t => t.dates.includes(date));
  }, [tasks]);

  const addTaskToDate = useCallback((taskId: string, date: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId && !t.dates.includes(date)
        ? { ...t, dates: [...t.dates, date] }
        : t
    ));
  }, []);

  const addSession = useCallback((session: Omit<Session, 'id'>) => {
    setSessions(prev => [...prev, { ...session, id: crypto.randomUUID() }]);
  }, []);

  const getSessionsForDate = useCallback((date: string) => {
    return sessions.filter(s => s.date === date);
  }, [sessions]);

  const toggleTaskCompletion = useCallback((taskId: string, date: string) => {
    const key = `${taskId}_${date}`;
    setCompletions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isTaskCompleted = useCallback((taskId: string, date: string) => {
    return !!completions[`${taskId}_${date}`];
  }, [completions]);

  const setTaskCompleted = useCallback((taskId: string, date: string, completed: boolean) => {
    const key = `${taskId}_${date}`;
    setCompletions(prev => ({ ...prev, [key]: completed }));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const clearAllData = useCallback(() => {
    setTasks([]);
    setSessions([]);
    setCompletions({});
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify({ tasks, sessions, completions, settings }, null, 2);
  }, [tasks, sessions, completions, settings]);

  const taskExists = useCallback((name: string) => {
    return tasks.some(t => t.name.toLowerCase() === name.toLowerCase());
  }, [tasks]);

  return (
    <AppContext.Provider value={{
      tasks, sessions, completions, settings, timer,
      addTask, updateTask, deleteTask, getTasksForDate, addTaskToDate,
      addSession, getSessionsForDate,
      toggleTaskCompletion, isTaskCompleted, setTaskCompleted,
      updateSettings, clearAllData, exportData, taskExists,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
