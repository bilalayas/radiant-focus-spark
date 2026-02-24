import { useState, useMemo } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useApp } from '@/context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DailyTimeline } from '@/components/DailyTimeline';

const COLORS = [
  'hsl(152,44%,34%)', 'hsl(210,55%,45%)', 'hsl(340,55%,60%)',
  'hsl(45,70%,50%)', 'hsl(280,45%,55%)', 'hsl(20,70%,50%)',
];

export default function AnalyticsPage() {
  const { sessions, tasks, isTaskCompleted, getTasksForDate, getSessionsForDate } = useApp();
  const [durationRange, setDurationRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = getSessionsForDate(todayStr);
  const todayTasks = getTasksForDate(todayStr);
  const allTasksCompleted = todayTasks.length > 0 && todayTasks.every(t => isTaskCompleted(t.id, todayStr));

  const durationData = useMemo(() => {
    const today = new Date();
    let days: Date[];
    if (durationRange === 'daily') {
      days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
    } else if (durationRange === 'weekly') {
      days = Array.from({ length: 4 }, (_, i) => subDays(today, (3 - i) * 7));
    } else {
      days = Array.from({ length: 6 }, (_, i) => subDays(today, (5 - i) * 30));
    }
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let matchingSessions;
      if (durationRange === 'daily') {
        matchingSessions = sessions.filter(s => s.date === dateStr && s.type === 'work');
      } else if (durationRange === 'weekly') {
        const weekS = startOfWeek(day, { weekStartsOn: 1 });
        const weekE = endOfWeek(day, { weekStartsOn: 1 });
        matchingSessions = sessions.filter(s => { const d = new Date(s.date); return s.type === 'work' && isWithinInterval(d, { start: weekS, end: weekE }); });
      } else {
        const monthS = startOfMonth(day);
        const monthE = endOfMonth(day);
        matchingSessions = sessions.filter(s => { const d = new Date(s.date); return s.type === 'work' && isWithinInterval(d, { start: monthS, end: monthE }); });
      }
      const totalMinutes = Math.round(matchingSessions.reduce((sum, s) => sum + s.duration, 0) / 60);
      const label = durationRange === 'daily' ? format(day, 'EEE', { locale: tr }) : durationRange === 'weekly' ? `H${format(day, 'w')}` : format(day, 'MMM', { locale: tr });
      return { label, minutes: totalMinutes };
    });
  }, [sessions, durationRange]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    sessions.filter(s => s.type === 'work').forEach(s => {
      const task = tasks.find(t => t.id === s.taskId);
      const cat = task?.category || 'Diğer';
      catMap[cat] = (catMap[cat] || 0) + s.duration;
    });
    return Object.entries(catMap).map(([name, seconds]) => ({ name, value: Math.round(seconds / 60) }));
  }, [sessions, tasks]);

  const predictionData = useMemo(() => {
    const taskMap: Record<string, { planned: number; actual: number }> = {};
    tasks.forEach(t => {
      if (t.plannedDuration) {
        const taskSessions = sessions.filter(s => s.taskId === t.id && s.type === 'work');
        const actual = Math.round(taskSessions.reduce((sum, s) => sum + s.duration, 0) / 60);
        if (actual > 0) {
          taskMap[t.name] = { planned: t.plannedDuration, actual };
        }
      }
    });
    return Object.entries(taskMap).map(([name, data]) => ({
      name: name.length > 12 ? name.slice(0, 12) + '...' : name,
      planned: data.planned, actual: data.actual,
      diff: data.actual - data.planned,
      pct: Math.round(((data.actual - data.planned) / data.planned) * 100),
    }));
  }, [sessions, tasks]);

  const avgDeviation = predictionData.length > 0
    ? Math.round(predictionData.reduce((sum, d) => sum + Math.abs(d.pct), 0) / predictionData.length) : 0;

  const formatMin = (m: number) => {
    if (m >= 60) return `${Math.floor(m / 60)}s ${m % 60}dk`;
    return `${m}dk`;
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-lg font-bold mb-4 text-foreground">Analiz</h1>

      {/* Daily Timeline */}
      <div className="mb-4">
        <DailyTimeline sessions={todaySessions} tasks={tasks} allTasksCompleted={allTasksCompleted} />
      </div>

      <Tabs defaultValue="duration">
        <TabsList className="w-full rounded-xl mb-4">
          <TabsTrigger value="duration" className="flex-1 rounded-lg">Süre</TabsTrigger>
          <TabsTrigger value="prediction" className="flex-1 rounded-lg">Tahmin</TabsTrigger>
        </TabsList>

        <TabsContent value="duration" className="space-y-4">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {(['daily', 'weekly', 'monthly'] as const).map(r => (
              <button key={r} onClick={() => setDurationRange(r)} className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${durationRange === r ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground'}`}>
                {r === 'daily' ? 'Günlük' : r === 'weekly' ? 'Haftalık' : 'Aylık'}
              </button>
            ))}
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-3">Çalışma Süresi (dk)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={durationData} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => [formatMin(v), 'Süre']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]}
                  label={{ position: 'top', formatter: (v: number) => v > 0 ? `${v}dk` : '', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {categoryData.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <p className="text-xs text-muted-foreground mb-3">Kategori Dağılımı</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatMin(v), 'Süre']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 mt-3">
                {categoryData.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-foreground truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground shrink-0">{formatMin(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prediction" className="space-y-4">
          {predictionData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Henüz yeterli veri yok.</p>
            </div>
          ) : (
            <>
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">Ortalama Sapma</p>
                <p className="text-2xl font-bold text-foreground">%{avgDeviation}</p>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-3">Planlanan vs Gerçekleşen (dk)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={predictionData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Planlanan" />
                    <Bar dataKey="actual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Gerçekleşen" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-3">Yüzdesel Fark</p>
                <div className="space-y-2">
                  {predictionData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <span className="text-sm text-card-foreground truncate flex-1">{d.name}</span>
                      <span className={`text-sm font-medium ml-2 ${d.pct > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {d.pct > 0 ? '+' : ''}{d.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
