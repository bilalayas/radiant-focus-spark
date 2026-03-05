import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Test {
  id: string;
  user_id: string;
  created_by: string;
  name: string;
  subject: string;
  topic?: string;
  correct_count: number;
  wrong_count: number;
  blank_count: number;
  total_questions: number;
  solve_duration: number;
  analysis_duration: number;
  date: string;
  status: string;
  created_at: string;
}

export function useTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('tests')
      .select('*')
      .or(`user_id.eq.${user.id},created_by.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (data) setTests(data as unknown as Test[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const addTest = useCallback(async (test: Omit<Test, 'id' | 'created_at'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tests')
      .insert(test as any)
      .select()
      .single();
    if (!error && data) {
      setTests(prev => [data as unknown as Test, ...prev]);
    }
    return { data, error };
  }, [user]);

  const updateTest = useCallback(async (id: string, updates: Partial<Test>) => {
    const { error } = await supabase
      .from('tests')
      .update(updates as any)
      .eq('id', id);
    if (!error) {
      setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }
    return { error };
  }, []);

  const deleteTest = useCallback(async (id: string) => {
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (!error) setTests(prev => prev.filter(t => t.id !== id));
    return { error };
  }, []);

  const getTestsForStudent = useCallback(async (studentId: string) => {
    const { data } = await supabase
      .from('tests')
      .select('*')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false });
    return (data || []) as unknown as Test[];
  }, []);

  return { tests, loading, addTest, updateTest, deleteTest, fetchTests, getTestsForStudent };
}
