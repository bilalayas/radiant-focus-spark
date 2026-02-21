import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'teacher' | 'student' | 'user';

export function useRoles(user: User | null) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    if (!user) { setRoles([]); setLoading(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    setRoles((data || []).map(r => r.role as AppRole));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  return { roles, loading, hasRole, refetch: fetchRoles };
}
