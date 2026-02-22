import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { addPendingChange, getCachedTasks } from '@/hooks/useOfflineSync';
import type { Task } from '@/types';

export function useSupabaseTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    
    if (!navigator.onLine) {
      // Load from cache when offline
      setTasks(getCachedTasks());
      setLoading(false);
      return;
    }
    
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
    } else if (error) {
      // Fallback to cache on error
      setTasks(getCachedTasks());
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
    if (!user) return null;
    const tempId = crypto.randomUUID();
    const dbRow = {
      id: tempId,
      user_id: user.id,
      name: task.name,
      category: task.category ?? null,
      planned_duration: task.plannedDuration ?? null,
      start_hour: task.startHour ?? null,
      dates: task.dates,
    };

    // Optimistic update
    const newTask: Task = { ...task, id: tempId };
    setTasks(prev => [newTask, ...prev]);

    if (!navigator.onLine) {
      addPendingChange({ table: 'tasks', type: 'insert', data: dbRow });
      return newTask;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(dbRow)
      .select()
      .single();
    if (!error && data) {
      // Update with real ID if different
      if (data.id !== tempId) {
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
        return { ...newTask, id: data.id };
      }
    } else if (error) {
      addPendingChange({ table: 'tasks', type: 'insert', data: dbRow });
    }
    return newTask;
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
