import { useState, useMemo } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useApp } from '@/context/AppContext';
import { useTests } from '@/hooks/useTests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DailyTimeline } from '@/components/DailyTimeline';

const COLORS = [
  'hsl(152,44%,34%)', 'hsl(210,55%,45%)', 'hsl(340,55%,60%)',
  'hsl(45,70%,50%)', 'hsl(280,45%,55%)', 'hsl(20,70%,50%)',
];

export default function AnalyticsPage() {
  const { sessions, tasks, isTaskCompleted, getTasksForDate, getSessionsForDate } = useApp();
  const { tests } = useTests();
  const [durationRange, setDurationRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = getSessionsForDate(todayStr);
  const todayTasks = getTasksForDate(todayStr);
  const allTasksCompleted = todayTasks.length > 0 && todayTasks.every(t => isTaskCompleted(t.id, todayStr));

  const completedTests = useMemo(() => tests.filter(t => t.status === 'completed'), [tests]);

  // Test analytics
  const testStats = useMemo(() => {
    if (completedTests.length === 0) return null;
    const totalCorrect = completedTests.reduce((s, t) => s + t.correct_count, 0);
    const totalWrong = completedTests.reduce((s, t) => s + t.wrong_count, 0);
    const totalBlank = completedTests.reduce((s, t) => s + t.blank_count, 0);
    const totalQuestions = completedTests.reduce((s, t) => s + t.total_questions, 0);
    const totalSolveDur = completedTests.reduce((s, t) => s + t.solve_duration, 0);
    const totalAnalysisDur = completedTests.reduce((s, t) => s + t.analysis_duration, 0);
    const totalNet = totalCorrect - totalWrong * 0.25;
    return { totalCorrect, totalWrong, totalBlank, totalQuestions, totalSolveDur, totalAnalysisDur, totalNet, count: completedTests.length };
  }, [completedTests]);

  // Test per-subject breakdown
  const testBySubject = useMemo(() => {
    const map: Record<string, { correct: number; wrong: number; blank: number; total: number; net: number; count: number }> = {};
    completedTests.forEach(t => {
      if (!map[t.subject]) map[t.subject] = { correct: 0, wrong: 0, blank: 0, total: 0, net: 0, count: 0 };
      map[t.subject].correct += t.correct_count;
      map[t.subject].wrong += t.wrong_count;
      map[t.subject].blank += t.blank_count;
      map[t.subject].total += t.total_questions;
      map[t.subject].net += t.correct_count - t.wrong_count * 0.25;
      map[t.subject].count += 1;
    });
    return Object.entries(map).map(([subject, data]) => ({ subject, ...data }));
  }, [completedTests]);

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

  const net = (c: number, w: number) => (c - w * 0.25).toFixed(2);

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
          <TabsTrigger value="tests" className="flex-1 rounded-lg">Testler</TabsTrigger>
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

        {/* ─── TEST ANALYTICS ─── */}
        <TabsContent value="tests" className="space-y-4">
          {!testStats ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Henüz tamamlanmış test yok.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                  <p className="text-[10px] text-muted-foreground">Toplam Net</p>
                  <p className="text-xl font-bold text-primary">{testStats.totalNet.toFixed(2)}</p>
                </div>
                <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                  <p className="text-[10px] text-muted-foreground">Toplam Test</p>
                  <p className="text-xl font-bold text-foreground">{testStats.count}</p>
                </div>
                <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                  <p className="text-[10px] text-muted-foreground">Toplam Soru</p>
                  <p className="text-xl font-bold text-foreground">{testStats.totalQuestions}</p>
                </div>
                <div className="bg-card rounded-2xl p-3 border border-border shadow-sm">
                  <p className="text-[10px] text-muted-foreground">D / Y / B</p>
                  <p className="text-sm font-bold text-foreground">
                    <span className="text-primary">{testStats.totalCorrect}</span> / <span className="text-destructive">{testStats.totalWrong}</span> / <span className="text-muted-foreground">{testStats.totalBlank}</span>
                  </p>
                </div>
              </div>

              {/* Success ratio */}
              {testStats.totalQuestions > 0 && (
                <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                  <p className="text-xs text-muted-foreground mb-2">Başarı Oranı</p>
                  <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                    <div className="bg-primary h-full transition-all" style={{ width: `${(testStats.totalCorrect / testStats.totalQuestions) * 100}%` }} />
                    <div className="bg-destructive h-full transition-all" style={{ width: `${(testStats.totalWrong / testStats.totalQuestions) * 100}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-primary">%{Math.round((testStats.totalCorrect / testStats.totalQuestions) * 100)} Doğru</span>
                    <span className="text-[10px] text-destructive">%{Math.round((testStats.totalWrong / testStats.totalQuestions) * 100)} Yanlış</span>
                    <span className="text-[10px] text-muted-foreground">%{Math.round((testStats.totalBlank / testStats.totalQuestions) * 100)} Boş</span>
                  </div>
                </div>
              )}

              {/* Duration stats */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-2">Süre Özeti</p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Çözüm</p>
                    <p className="text-sm font-bold text-foreground">{formatMin(testStats.totalSolveDur)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Analiz</p>
                    <p className="text-sm font-bold text-foreground">{formatMin(testStats.totalAnalysisDur)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Toplam</p>
                    <p className="text-sm font-bold text-foreground">{formatMin(testStats.totalSolveDur + testStats.totalAnalysisDur)}</p>
                  </div>
                </div>
              </div>

              {/* Per-subject breakdown */}
              {testBySubject.length > 0 && (
                <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                  <p className="text-xs text-muted-foreground mb-3">Ders Bazlı Analiz</p>
                  <div className="space-y-2">
                    {testBySubject.map((s, i) => (
                      <div key={s.subject} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-foreground truncate">{s.subject}</span>
                          <span className="text-[10px] text-muted-foreground">({s.count})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">D:{s.correct} Y:{s.wrong} B:{s.blank}</span>
                          <span className="text-xs font-bold text-primary">{s.net.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual test results */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-3">Son Testler</p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {completedTests.slice(0, 20).map(test => (
                    <div key={test.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{test.name}</p>
                        <div className="flex gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{test.subject}</span>
                          {test.book_name && <span className="text-[10px] text-muted-foreground">• {test.book_name}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 text-right ml-2">
                        <p className="text-xs font-bold text-primary">{net(test.correct_count, test.wrong_count)}</p>
                        <p className="text-[9px] text-muted-foreground">{test.solve_duration}dk</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
