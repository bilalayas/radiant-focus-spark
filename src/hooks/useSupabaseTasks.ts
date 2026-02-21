import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Task } from '@/types';

export function useSupabaseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTasks(data.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category ?? undefined,
        plannedDuration: row.planned_duration ?? undefined,
        startHour: row.start_hour ?? undefined,
        dates: row.dates ?? [],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        name: task.name,
        category: task.category ?? null,
        planned_duration: task.plannedDuration ?? null,
        start_hour: task.startHour ?? null,
        dates: task.dates,
      })
      .select()
      .single();
    if (!error && data) {
      const newTask: Task = {
        id: data.id,
        name: data.name,
        category: data.category ?? undefined,
        plannedDuration: data.planned_duration ?? undefined,
        startHour: data.start_hour ?? undefined,
        dates: data.dates ?? [],
      };
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    }
    return null;
  }, [user]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.plannedDuration !== undefined) dbUpdates.planned_duration = updates.plannedDuration;
    if (updates.startHour !== undefined) dbUpdates.start_hour = updates.startHour;
    if (updates.dates !== undefined) dbUpdates.dates = updates.dates;

    await supabase.from('tasks').update(dbUpdates).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTasksForDate = useCallback((date: string) => {
    return tasks.filter(t => t.dates.includes(date));
  }, [tasks]);

  const addTaskToDate = useCallback(async (taskId: string, date: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.dates.includes(date)) return;
    const newDates = [...task.dates, date];
    await supabase.from('tasks').update({ dates: newDates }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dates: newDates } : t));
  }, [tasks]);

  return { tasks, loading, addTask, updateTask, deleteTask, getTasksForDate, addTaskToDate, refetch: fetchTasks };
}
