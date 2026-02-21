import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Session } from '@/types';

export function useSupabaseSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) { setSessions([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setSessions(data.map(row => ({
        id: row.id,
        taskId: row.task_id || '',
        taskName: row.task_name,
        date: row.date,
        duration: row.duration,
        type: row.type as 'work' | 'break',
        timestamp: row.timestamp,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const addSession = useCallback(async (session: Omit<Session, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        task_id: session.taskId || null,
        task_name: session.taskName,
        date: session.date,
        duration: session.duration,
        type: session.type,
        timestamp: session.timestamp,
      })
      .select()
      .single();
    if (!error && data) {
      const newSession: Session = {
        id: data.id,
        taskId: data.task_id || '',
        taskName: data.task_name,
        date: data.date,
        duration: data.duration,
        type: data.type as 'work' | 'break',
        timestamp: data.timestamp,
      };
      setSessions(prev => [newSession, ...prev]);
    }
  }, [user]);

  const getSessionsForDate = useCallback((date: string) => {
    return sessions.filter(s => s.date === date);
  }, [sessions]);

  // Fetch sessions for a specific user (teacher viewing student)
  const fetchSessionsForUser = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      return data.map(row => ({
        id: row.id,
        taskId: row.task_id || '',
        taskName: row.task_name,
        date: row.date,
        duration: row.duration,
        type: row.type as 'work' | 'break',
        timestamp: row.timestamp,
      }));
    }
    return [];
  }, []);

  return { sessions, loading, addSession, getSessionsForDate, fetchSessionsForUser, refetch: fetchSessions };
}
