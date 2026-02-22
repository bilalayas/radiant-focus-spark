import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task, Session } from '@/types';

const PENDING_KEY = 'offline_pending_changes';
const TASKS_CACHE_KEY = 'offline_tasks_cache';
const SESSIONS_CACHE_KEY = 'offline_sessions_cache';

interface PendingChange {
  id: string;
  table: 'tasks' | 'sessions' | 'task_completions';
  type: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

function getPendingChanges(): PendingChange[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch { return []; }
}

function savePendingChanges(changes: PendingChange[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(changes));
}

export function addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>) {
  const changes = getPendingChanges();
  changes.push({ ...change, id: crypto.randomUUID(), timestamp: Date.now() });
  savePendingChanges(changes);
}

export function cacheTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
}

export function getCachedTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_CACHE_KEY) || '[]');
  } catch { return []; }
}

export function cacheSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions));
}

export function getCachedSessions(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_CACHE_KEY) || '[]');
  } catch { return []; }
}

export function useOfflineSync(userId: string | undefined, onSynced?: () => void) {
  const syncingRef = useRef(false);

  const syncPendingChanges = useCallback(async () => {
    if (!userId || syncingRef.current) return;
    const changes = getPendingChanges();
    if (changes.length === 0) return;

    syncingRef.current = true;
    const remaining: PendingChange[] = [];

    for (const change of changes) {
      try {
        let error: any = null;
        if (change.type === 'insert') {
          const res = await supabase.from(change.table).insert(change.data as any);
          error = res.error;
        } else if (change.type === 'update') {
          const { id: rowId, ...rest } = change.data;
          const res = await supabase.from(change.table).update(rest as any).eq('id', rowId as string);
          error = res.error;
        } else if (change.type === 'delete') {
          const res = await supabase.from(change.table).delete().eq('id', change.data.id as string);
          error = res.error;
        }
        if (error) {
          // Keep failed changes for retry (unless it's a duplicate key)
          if (!error.message?.includes('duplicate')) {
            remaining.push(change);
          }
        }
      } catch {
        remaining.push(change);
      }
    }

    savePendingChanges(remaining);
    syncingRef.current = false;

    if (remaining.length < changes.length && onSynced) {
      onSynced();
    }
  }, [userId, onSynced]);

  // Sync when coming online
  useEffect(() => {
    const handleOnline = () => { syncPendingChanges(); };
    window.addEventListener('online', handleOnline);

    // Also try to sync on mount
    if (navigator.onLine) syncPendingChanges();

    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingChanges]);

  return { syncPendingChanges, hasPending: getPendingChanges().length > 0 };
}
