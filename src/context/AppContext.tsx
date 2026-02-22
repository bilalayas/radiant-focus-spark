import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppSettings, defaultSettings } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSupabaseTasks } from '@/hooks/useSupabaseTasks';
import { useSupabaseSessions } from '@/hooks/useSupabaseSessions';
import { useSupabaseCompletions } from '@/hooks/useSupabaseCompletions';
import { useRoles } from '@/hooks/useRoles';
import { useCoach } from '@/hooks/useCoach';
import { useOfflineSync, cacheTasks, cacheSessions } from '@/hooks/useOfflineSync';
import type { Task, Session } from '@/types';
import type { AppRole } from '@/hooks/useRoles';
import type { CoachRelationship } from '@/hooks/useCoach';

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
  // Auth & Profile
  user: ReturnType<typeof useAuth>['user'];
  authLoading: boolean;
  profile: ReturnType<typeof useProfile>['profile'];
  updateProfile: ReturnType<typeof useProfile>['updateProfile'];
  // Roles
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  activeRole: string;
  setActiveRole: (role: string) => void;
  // Coach
  referralCode: string | null;
  coachRelationships: CoachRelationship[];
  pendingRequests: CoachRelationship[];
  acceptedStudents: CoachRelationship[];
  acceptedTeachers: CoachRelationship[];
  sendCoachRequest: ReturnType<typeof useCoach>['sendRequest'];
  respondToCoachRequest: ReturnType<typeof useCoach>['respondToRequest'];
  lookupReferralCode: ReturnType<typeof useCoach>['lookupCode'];
  refetchCoach: () => void;
  // Sessions for other users (teacher)
  fetchSessionsForUser: ReturnType<typeof useSupabaseSessions>['fetchSessionsForUser'];
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
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile } = useProfile(user);
  const { roles, hasRole } = useRoles(user);
  const { 
    referralCode, relationships: coachRelationships, pendingRequests,
    acceptedStudents, acceptedTeachers,
    sendRequest: sendCoachRequest, respondToRequest: respondToCoachRequest,
    lookupCode: lookupReferralCode, refetch: refetchCoach,
  } = useCoach(user);

  // Supabase-backed data
  const { tasks: sbTasks, addTask: sbAddTask, updateTask: sbUpdateTask, deleteTask: sbDeleteTask, getTasksForDate: sbGetTasksForDate, addTaskToDate: sbAddTaskToDate, refetch: refetchTasks } = useSupabaseTasks();
  const { sessions: sbSessions, addSession: sbAddSession, getSessionsForDate: sbGetSessionsForDate, fetchSessionsForUser, refetch: refetchSessions } = useSupabaseSessions();
  const { completions, isTaskCompleted, setTaskCompleted, toggleTaskCompletion } = useSupabaseCompletions();

  // Offline sync
  const handleSynced = useCallback(() => {
    refetchTasks();
    refetchSessions();
  }, [refetchTasks, refetchSessions]);
  useOfflineSync(user?.id, handleSynced);

  // Cache data locally for offline access
  useEffect(() => { if (sbTasks.length > 0) cacheTasks(sbTasks); }, [sbTasks]);
  useEffect(() => { if (sbSessions.length > 0) cacheSessions(sbSessions); }, [sbSessions]);

  const [settings, setSettings] = useState<AppSettings>(() => ({ ...defaultSettings, ...load('app_settings', defaultSettings) }));

  // Active role from profile
  const [activeRole, setActiveRoleState] = useState<string>(profile?.active_role || 'student');

  useEffect(() => {
    if (profile?.active_role) setActiveRoleState(profile.active_role);
  }, [profile?.active_role]);

  const setActiveRole = useCallback(async (role: string) => {
    setActiveRoleState(role);
    if (user) {
      await updateProfile({ active_role: role } as any);
    }
  }, [user, updateProfile]);

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

  // Sync settings useCase with profile
  useEffect(() => {
    if (profile?.use_case && profile.use_case !== settings.useCase) {
      setSettings(prev => ({ ...prev, useCase: profile.use_case || prev.useCase, onboardingDone: !!profile.use_case }));
    }
  }, [profile?.use_case]);

  // Wrapper for addTask that returns sync Task
  const addTask = useCallback((task: Omit<Task, 'id'>) => {
    const tempTask: Task = { ...task, id: crypto.randomUUID() };
    sbAddTask(task); // fire and forget async
    return tempTask;
  }, [sbAddTask]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const clearAllData = useCallback(() => {
    // Only clears local settings
    setSettings(defaultSettings);
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify({ tasks: sbTasks, sessions: sbSessions, completions, settings }, null, 2);
  }, [sbTasks, sbSessions, completions, settings]);

  const taskExists = useCallback((name: string) => {
    return sbTasks.some(t => t.name.toLowerCase() === name.toLowerCase());
  }, [sbTasks]);

  return (
    <AppContext.Provider value={{
      tasks: sbTasks,
      sessions: sbSessions,
      completions,
      settings,
      timer,
      addTask,
      updateTask: sbUpdateTask as any,
      deleteTask: sbDeleteTask as any,
      getTasksForDate: sbGetTasksForDate,
      addTaskToDate: sbAddTaskToDate as any,
      addSession: sbAddSession as any,
      getSessionsForDate: sbGetSessionsForDate,
      toggleTaskCompletion: toggleTaskCompletion as any,
      isTaskCompleted,
      setTaskCompleted: setTaskCompleted as any,
      updateSettings,
      clearAllData,
      exportData,
      taskExists,
      user,
      authLoading,
      profile,
      updateProfile,
      roles,
      hasRole,
      activeRole,
      setActiveRole,
      referralCode,
      coachRelationships,
      pendingRequests,
      acceptedStudents,
      acceptedTeachers,
      sendCoachRequest,
      respondToCoachRequest: respondToCoachRequest,
      lookupReferralCode,
      refetchCoach,
      fetchSessionsForUser,
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
