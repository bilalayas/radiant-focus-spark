import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, BarChart3, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Session, Task } from '@/types';

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { acceptedStudents, fetchSessionsForUser } = useApp();
  const student = acceptedStudents.find(s => s.student_id === studentId);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      const [sessData, taskData] = await Promise.all([
        fetchSessionsForUser(studentId),
        supabase.from('tasks').select('*').eq('user_id', studentId).then(r => r.data || []),
      ]);
      setSessions(sessData);
      setTasks(taskData.map(row => ({
        id: row.id, name: row.name, category: row.category ?? undefined,
        plannedDuration: row.planned_duration ?? undefined, startHour: row.start_hour ?? undefined,
        dates: row.dates ?? [],
      })));
      setLoading(false);
    })();
  }, [studentId, fetchSessionsForUser]);

  const durationData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const dateStr = format(day, 'yyyy-MM-dd');
      const mins = Math.round(
        sessions.filter(s => s.date === dateStr && s.type === 'work')
          .reduce((sum, s) => sum + s.duration, 0) / 60
      );
      return { label: format(day, 'EEE', { locale: tr }), minutes: mins };
    });
  }, [sessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> Geri
      </button>

      <h1 className="text-lg font-bold text-foreground mb-1">{student?.student_name || 'Öğrenci'}</h1>
      <p className="text-xs text-muted-foreground mb-6">Analiz Verileri (salt okunur)</p>

      <Tabs defaultValue="analytics">
        <TabsList className="w-full rounded-xl mb-4">
          <TabsTrigger value="analytics" className="flex-1 rounded-lg"><BarChart3 size={14} className="mr-1" /> Analiz</TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 rounded-lg"><Calendar size={14} className="mr-1" /> Görevler</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-3">Son 7 Gün Çalışma (dk)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={durationData}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => [`${v}dk`, 'Süre']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-2">Toplam İstatistik</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(sessions.filter(s => s.type === 'work').reduce((sum, s) => sum + s.duration, 0) / 3600)}s
                </p>
                <p className="text-xs text-muted-foreground">Toplam Çalışma</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Toplam Görev</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Henüz görev yok.</p>
          ) : (
            tasks.map(task => (
              <div key={task.id} className="bg-card rounded-xl p-3 border border-border shadow-sm">
                <p className="text-sm font-medium text-card-foreground">{task.name}</p>
                {task.category && <p className="text-xs text-muted-foreground">{task.category}</p>}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
