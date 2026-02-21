import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface CoachRelationship {
  id: string;
  teacher_id: string;
  student_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  initiated_by: string;
  created_at: string;
  teacher_name?: string;
  student_name?: string;
}

export function useCoach(user: User | null) {
  const [relationships, setRelationships] = useState<CoachRelationship[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CoachRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setRelationships([]); setReferralCode(null); setPendingRequests([]); setLoading(false); return; }

    // Fetch referral code
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .single();
    setReferralCode(codeData?.code || null);

    // Fetch relationships with profile names
    const { data: rels } = await supabase
      .from('coach_relationships')
      .select('*')
      .or(`teacher_id.eq.${user.id},student_id.eq.${user.id}`);

    if (rels && rels.length > 0) {
      // Fetch names for all related users
      const userIds = new Set<string>();
      rels.forEach(r => { userIds.add(r.teacher_id); userIds.add(r.student_id); });
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));
      
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.display_name || 'İsimsiz'; });

      const mapped = rels.map(r => ({
        ...r,
        status: r.status as 'pending' | 'accepted' | 'rejected',
        teacher_name: nameMap[r.teacher_id],
        student_name: nameMap[r.student_id],
      }));
      setRelationships(mapped);
      setPendingRequests(mapped.filter(r => 
        r.status === 'pending' && r.initiated_by !== user.id
      ));
    } else {
      setRelationships([]);
      setPendingRequests([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sendRequest = useCallback(async (targetUserId: string, targetIsTeacher: boolean) => {
    if (!user) return { error: 'Not logged in' };
    const teacherId = targetIsTeacher ? targetUserId : user.id;
    const studentId = targetIsTeacher ? user.id : targetUserId;
    
    const { error } = await supabase
      .from('coach_relationships')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        initiated_by: user.id,
        status: 'pending',
      });
    
    if (!error) await fetchAll();
    return { error: error?.message || null };
  }, [user, fetchAll]);

  const respondToRequest = useCallback(async (relationshipId: string, accept: boolean) => {
    const { error } = await supabase
      .from('coach_relationships')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', relationshipId);
    if (!error) await fetchAll();
    return { error: error?.message || null };
  }, [fetchAll]);

  const lookupCode = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc('lookup_referral_code', { _code: code });
    if (error || !data || data.length === 0) return null;
    return data[0] as { user_id: string; display_name: string; has_teacher_role: boolean };
  }, []);

  const acceptedStudents = relationships.filter(r => r.status === 'accepted' && r.teacher_id === user?.id);
  const acceptedTeachers = relationships.filter(r => r.status === 'accepted' && r.student_id === user?.id);

  return {
    relationships, referralCode, pendingRequests, loading,
    sendRequest, respondToRequest, lookupCode,
    acceptedStudents, acceptedTeachers,
    refetch: fetchAll,
  };
}
