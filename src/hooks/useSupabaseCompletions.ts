import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSupabaseCompletions() {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchCompletions = useCallback(async () => {
    if (!user) { setCompletions({}); setLoading(false); return; }
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', user.id);
    const map: Record<string, boolean> = {};
    (data || []).forEach(row => {
      map[`${row.task_id}_${row.date}`] = row.completed;
    });
    setCompletions(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCompletions(); }, [fetchCompletions]);

  const isTaskCompleted = useCallback((taskId: string, date: string) => {
    return !!completions[`${taskId}_${date}`];
  }, [completions]);

  const setTaskCompleted = useCallback(async (taskId: string, date: string, completed: boolean) => {
    if (!user) return;
    const key = `${taskId}_${date}`;
    // Optimistic update
    setCompletions(prev => ({ ...prev, [key]: completed }));

    // Upsert to DB
    const { data: existing } = await supabase
      .from('task_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .eq('date', date)
      .single();

    if (existing) {
      await supabase
        .from('task_completions')
        .update({ completed })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('task_completions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          date,
          completed,
        });
    }
  }, [user]);

  const toggleTaskCompletion = useCallback(async (taskId: string, date: string) => {
    const current = isTaskCompleted(taskId, date);
    await setTaskCompleted(taskId, date, !current);
  }, [isTaskCompleted, setTaskCompleted]);

  return { completions, loading, isTaskCompleted, setTaskCompleted, toggleTaskCompletion, refetch: fetchCompletions };
}
