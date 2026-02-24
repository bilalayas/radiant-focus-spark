import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, BarChart3, Calendar, Plus, Trash2, Send, Archive, RotateCcw, MessageSquare } from 'lucide-react';
import { format, subDays, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Session, Task } from '@/types';

interface PlanTask {
  name: string;
  category?: string;
  plannedDuration?: number;
  startHour?: number;
  dates: string[];
}

interface PendingPlan {
  id: string;
  teacher_id: string;
  student_id: string;
  plan_data: PlanTask[];
  status: string;
  rejection_reason?: string;
  messages: Array<{ from: string; text: string; timestamp: string }>;
  created_at: string;
  updated_at: string;
}

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { acceptedStudents, fetchSessionsForUser, user } = useApp();
  const student = acceptedStudents.find(s => s.student_id === studentId);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<PendingPlan[]>([]);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [draftTasks, setDraftTasks] = useState<PlanTask[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('');
  const [newTaskHour, setNewTaskHour] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  // Chat dialog
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ from: string; text: string; timestamp: string }>>([]);
  const [chatText, setChatText] = useState('');
  const [chatPlanId, setChatPlanId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Message dialog (archive)
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgPlan, setMsgPlan] = useState<PendingPlan | null>(null);
  const [msgText, setMsgText] = useState('');

  const selectedDayRef = useRef<HTMLButtonElement>(null);

  const totalDays = getDaysInMonth(new Date(selectedYear, selectedMonth));
  const selectedDate = new Date(selectedYear, selectedMonth, Math.min(selectedDay, totalDays));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

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
        dates: row.dates ?? [], source: (row as any).source ?? 'self',
      })));
      setLoading(false);
    })();
  }, [studentId, fetchSessionsForUser]);

  const fetchPlans = useCallback(async () => {
    if (!studentId || !user) return;
    const { data } = await supabase
      .from('pending_plans')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (data) {
      setPlans(data.map(p => ({
        ...p,
        plan_data: (Array.isArray(p.plan_data) ? p.plan_data : []) as unknown as PlanTask[],
        messages: (Array.isArray((p as any).messages) ? (p as any).messages : []) as any[],
        rejection_reason: (p as any).rejection_reason,
      })));
    }
  }, [studentId, user]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // Center selected day
  useEffect(() => {
    selectedDayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDay, selectedMonth, selectedYear]);

  const durationData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i);
      const ds = format(day, 'yyyy-MM-dd');
      const mins = Math.round(sessions.filter(s => s.date === ds && s.type === 'work').reduce((sum, s) => sum + s.duration, 0) / 60);
      return { label: format(day, 'EEE', { locale: tr }), minutes: mins };
    });
  }, [sessions]);

  const draftForDate = draftTasks.filter(t => t.dates.includes(dateStr));
  const studentTasksForDate = tasks.filter(t => t.dates.includes(dateStr));

  const handleAddDraftTask = () => {
    if (!newTaskName.trim()) return;
    setDraftTasks(prev => [...prev, {
      name: newTaskName.trim(),
      category: newTaskCategory.trim() || undefined,
      plannedDuration: newTaskDuration ? parseInt(newTaskDuration) : undefined,
      startHour: newTaskHour ? parseInt(newTaskHour) : undefined,
      dates: [dateStr],
    }]);
    setNewTaskName(''); setNewTaskCategory(''); setNewTaskDuration(''); setNewTaskHour('');
    setShowAddTask(false);
  };

  const handleRemoveDraftTask = (index: number) => {
    setDraftTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    if (draftTasks.length === 0 || !user || !studentId) return;
    const { error } = await supabase.from('pending_plans').insert({
      teacher_id: user.id,
      student_id: studentId,
      plan_data: draftTasks as any,
      status: 'pending',
    });
    if (error) {
      toast.error('Plan kaydedilemedi: ' + error.message);
    } else {
      toast.success('Plan taslağı gönderildi!');
      setDraftTasks([]);
      fetchPlans();
    }
  };

  const handleRestorePlan = (plan: PendingPlan) => {
    setDraftTasks(plan.plan_data);
    toast.success('Plan taslağa yüklendi');
  };

  const handleOpenMessages = (plan: PendingPlan) => {
    setMsgPlan(plan);
    setMsgDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!msgPlan || !msgText.trim() || !user) return;
    const newMsg = { from: user.id, text: msgText.trim(), timestamp: new Date().toISOString() };
    const updatedMessages = [...(msgPlan.messages || []), newMsg];
    const { error } = await supabase.from('pending_plans').update({ messages: updatedMessages as any }).eq('id', msgPlan.id);
    if (!error) {
      setMsgPlan({ ...msgPlan, messages: updatedMessages });
      setMsgText('');
      fetchPlans();
    }
  };

  // Open main chat with student
  const openChat = async () => {
    if (!user || !studentId) return;
    const { data } = await supabase
      .from('pending_plans')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setChatPlanId(data[0].id);
      setChatMessages(Array.isArray((data[0] as any).messages) ? (data[0] as any).messages : []);
    } else {
      const { data: newPlan } = await supabase
        .from('pending_plans')
        .insert({ teacher_id: user.id, student_id: studentId, plan_data: [], status: 'chat', messages: [] })
        .select().single();
      if (newPlan) { setChatPlanId(newPlan.id); setChatMessages([]); }
    }
    setChatOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatText.trim() || !chatPlanId || !user) return;
    const newMsg = { from: user.id, text: chatText.trim(), timestamp: new Date().toISOString() };
    const updated = [...chatMessages, newMsg];
    const { error } = await supabase.from('pending_plans').update({ messages: updated as any }).eq('id', chatPlanId);
    if (!error) { setChatMessages(updated); setChatText(''); }
  };

  useEffect(() => {
    if (chatOpen && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  const buildDayList = () => {
    const prevMonthDate = subMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const nextMonthDate = addMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const prevDays = getDaysInMonth(prevMonthDate);
    const currDays = getDaysInMonth(new Date(selectedYear, selectedMonth, 1));
    const nextDays = getDaysInMonth(nextMonthDate);
    const result: { day: number; month: number; year: number; type: 'prev' | 'curr' | 'next' }[] = [];
    for (let d = prevDays - 2; d <= prevDays; d++) result.push({ day: d, month: prevMonthDate.getMonth(), year: prevMonthDate.getFullYear(), type: 'prev' });
    for (let d = 1; d <= currDays; d++) result.push({ day: d, month: selectedMonth, year: selectedYear, type: 'curr' });
    for (let d = 1; d <= Math.min(3, nextDays); d++) result.push({ day: d, month: nextMonthDate.getMonth(), year: nextMonthDate.getFullYear(), type: 'next' });
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Header with back + chat button */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Geri
        </button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={openChat}>
          <MessageSquare size={14} className="mr-1" /> Chat
        </Button>
      </div>

      <h1 className="text-lg font-bold text-foreground mb-1">{student?.student_name || 'Öğrenci'}</h1>
      <p className="text-xs text-muted-foreground mb-6">Öğrenci Detay Paneli</p>

      <Tabs defaultValue="plan">
        <TabsList className="w-full rounded-xl mb-4">
          <TabsTrigger value="plan" className="flex-1 rounded-lg"><Calendar size={14} className="mr-1" /> Plan</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 rounded-lg"><BarChart3 size={14} className="mr-1" /> Analiz</TabsTrigger>
          <TabsTrigger value="archive" className="flex-1 rounded-lg"><Archive size={14} className="mr-1" /> Arşiv</TabsTrigger>
        </TabsList>

        {/* PLAN TAB */}
        <TabsContent value="plan" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{selectedDay} {monthNames[selectedMonth]} {selectedYear}</span>
            <span className="text-xs text-muted-foreground">{dayNames[selectedDate.getDay()]}</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 -mx-4 px-4 pb-1">
            {buildDayList().map((entry, idx) => {
              const d = new Date(entry.year, entry.month, entry.day);
              const isSelected = entry.day === selectedDay && entry.month === selectedMonth && entry.year === selectedYear;
              const isToday = entry.day === now.getDate() && entry.month === now.getMonth() && entry.year === now.getFullYear();
              const hasDraft = draftTasks.some(t => t.dates.includes(format(d, 'yyyy-MM-dd')));
              return (
                <button
                  key={`${entry.year}-${entry.month}-${entry.day}-${idx}`}
                  ref={isSelected ? selectedDayRef : undefined}
                  onClick={() => { setSelectedDay(entry.day); setSelectedMonth(entry.month); setSelectedYear(entry.year); }}
                  className={`flex flex-col items-center min-w-[40px] py-2 px-1 rounded-xl transition-all relative ${
                    isSelected ? 'bg-primary text-primary-foreground'
                    : isToday ? 'bg-accent text-accent-foreground'
                    : entry.type !== 'curr' ? 'text-muted-foreground/40'
                    : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  <span className="text-[9px] font-medium">{dayNames[d.getDay()]}</span>
                  <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{entry.day}</span>
                  {hasDraft && <div className="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-1" />}
                </button>
              );
            })}
          </div>

          {studentTasksForDate.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Öğrencinin mevcut görevleri</p>
              <div className="space-y-1.5">
                {studentTasksForDate.map(task => (
                  <div key={task.id} className={`px-3 py-2.5 rounded-xl border text-sm ${task.source === 'teacher' ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-card-foreground">{task.name}</span>
                      {task.source === 'teacher' && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">Koç</Badge>}
                    </div>
                    {(task.category || task.plannedDuration || task.startHour !== undefined) && (
                      <div className="flex gap-2 mt-0.5">
                        {task.category && <span className="text-[10px] text-muted-foreground">{task.category}</span>}
                        {task.plannedDuration && <span className="text-[10px] text-muted-foreground">{task.plannedDuration}dk</span>}
                        {task.startHour !== undefined && <span className="text-[10px] text-muted-foreground">{String(task.startHour).padStart(2, '0')}:00</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">Taslak görevler (bu gün)</p>
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={() => setShowAddTask(true)}>
                <Plus size={12} className="mr-1" /> Görev Ekle
              </Button>
            </div>
            {draftForDate.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-4">Bu tarih için taslak görev yok</p>
            ) : (
              <div className="space-y-1.5">
                {draftForDate.map((task, i) => {
                  const globalIdx = draftTasks.findIndex(t => t === task);
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 rounded-xl border border-primary/20 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-card-foreground truncate">{task.name}</p>
                        <div className="flex gap-2 mt-0.5">
                          {task.category && <span className="text-[10px] text-muted-foreground">{task.category}</span>}
                          {task.plannedDuration && <span className="text-[10px] text-muted-foreground">{task.plannedDuration}dk</span>}
                          {task.startHour !== undefined && <span className="text-[10px] text-muted-foreground">{String(task.startHour).padStart(2, '0')}:00</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveDraftTask(globalIdx)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {draftTasks.length > 0 && (
            <Button onClick={handleSaveDraft} className="w-full rounded-xl">
              <Send size={14} className="mr-2" /> Planı Öğrenciye Gönder ({draftTasks.length} görev)
            </Button>
          )}

          <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogContent className="rounded-2xl max-w-sm">
              <DialogHeader><DialogTitle>Görev Ekle — {dateStr}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Görev adı *" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="rounded-xl" autoFocus />
                <Input placeholder="Kategori (opsiyonel)" value={newTaskCategory} onChange={e => setNewTaskCategory(e.target.value)} className="rounded-xl" />
                <Input type="number" placeholder="Süre - dk (opsiyonel)" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} className="rounded-xl" />
                <Select value={newTaskHour} onValueChange={setNewTaskHour}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Saat (opsiyonel)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Zamansız</SelectItem>
                    {hours.map(h => (
                      <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddDraftTask} disabled={!newTaskName.trim()} className="w-full rounded-xl">Taslağa Ekle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ANALYTICS TAB */}
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

        {/* ARCHIVE TAB */}
        <TabsContent value="archive" className="space-y-3">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Henüz plan arşivi yok.</p>
          ) : (
            plans.map(plan => {
              const planDates = [...new Set((plan.plan_data || []).flatMap(t => t.dates))].sort();
              const statusLabel = plan.status === 'pending' ? 'Bekliyor' : plan.status === 'accepted' ? 'Onaylandı' : plan.status === 'rejected' ? 'Reddedildi' : 'Chat';
              const statusColor = plan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : plan.status === 'accepted' ? 'bg-green-100 text-green-800' : plan.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
              return (
                <div key={plan.id} className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{format(new Date(plan.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
                      <p className="text-sm font-medium text-foreground">{(plan.plan_data || []).length} görev • {planDates.length} gün</p>
                    </div>
                    <Badge className={`text-[10px] ${statusColor}`}>{statusLabel}</Badge>
                  </div>
                  {planDates.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {planDates.map(d => <span key={d} className="text-[10px] px-2 py-0.5 bg-accent rounded-lg">{d}</span>)}
                    </div>
                  )}
                  {plan.rejection_reason && (
                    <div className="bg-destructive/5 rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Red sebebi:</p>
                      <p className="text-xs text-foreground">{plan.rejection_reason}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg" onClick={() => handleRestorePlan(plan)}>
                      <RotateCcw size={12} className="mr-1" /> Yeniden Düzenle
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => handleOpenMessages(plan)}>
                      <MessageSquare size={12} className="mr-1" /> Mesajlar {(plan.messages || []).length > 0 && `(${plan.messages.length})`}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Archive Messages Dialog */}
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Mesajlar</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
            {(!msgPlan?.messages || msgPlan.messages.length === 0) && <p className="text-xs text-muted-foreground text-center py-6">Henüz mesaj yok</p>}
            {(msgPlan?.messages || []).map((msg, i) => {
              const isMine = msg.from === user?.id;
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${isMine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{format(new Date(msg.timestamp), 'HH:mm')}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Mesaj yaz..." className="rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && handleSendMessage()} />
            <Button size="sm" onClick={handleSendMessage} disabled={!msgText.trim()} className="rounded-xl"><Send size={14} /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={16} /> {student?.student_name || 'Öğrenci'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[50vh]">
            {chatMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Henüz mesaj yok</p>}
            {chatMessages.map((msg, i) => {
              const isMine = msg.from === user?.id;
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${isMine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{format(new Date(msg.timestamp), 'HH:mm')}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Mesaj yaz..." className="rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()} />
            <Button size="sm" onClick={handleSendChatMessage} disabled={!chatText.trim()} className="rounded-xl"><Send size={14} /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
