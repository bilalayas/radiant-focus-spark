import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  use_case: string | null;
}

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'use_case'>>) => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);
    await fetchProfile();
  }, [user, fetchProfile]);

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
