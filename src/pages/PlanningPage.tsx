import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import { Plus, Trash2, ChevronLeft, ChevronRight, Search, ExternalLink, List, ClipboardList, Youtube, BookOpen } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTemplates, TaskTemplate } from '@/hooks/useTemplates';
import { useTests } from '@/hooks/useTests';
import { Task } from '@/types';
import { getSubjectsForStudent, searchTopics } from '@/data/curriculum';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from '@/components/ui/drawer';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
}

export default function PlanningPage() {
  const {
    isTaskCompleted, settings, toggleTaskCompletion, profile,
    tasks, addTask: addTaskContext, updateTask, deleteTask, getTasksForDate,
  } = useApp();

  const addTask = (task: Omit<Task, 'id'>) => { addTaskContext(task); };
  const { templates, addTemplate, deleteTemplate } = useTemplates();
  const { tests } = useTests();

  // Undo state
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDeleteTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setLastDeleted(task);
    deleteTask(taskId);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    toast('Görev silindi', {
      action: {
        label: 'Geri Al',
        onClick: () => {
          if (task) {
            addTaskContext({ name: task.name, category: task.category, plannedDuration: task.plannedDuration, startHour: task.startHour, dates: task.dates, source: task.source });
            setLastDeleted(null);
            toast.success('Görev geri alındı');
          }
        },
      },
      duration: 5000,
    });
    undoTimeoutRef.current = setTimeout(() => setLastDeleted(null), 5000);
  }, [tasks, deleteTask, addTaskContext]);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const [fabOpen, setFabOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'tasks' | 'templates' | 'resources'>('tasks');
  const [taskSubMode, setTaskSubMode] = useState<'menu' | 'new' | 'existing'>('menu');
  const [templateSubMode, setTemplateSubMode] = useState<'menu' | 'create' | 'use'>('menu');
  const [resourceSubMode, setResourceSubMode] = useState<'menu' | 'admin' | 'youtube' | 'test'>('menu');

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newStartHour, setNewStartHour] = useState<string>('');
  const [newDescription, setNewDescription] = useState('');
  const [pendingHour, setPendingHour] = useState<number | null>(null);
  const [topicSearch, setTopicSearch] = useState('');

  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplDuration, setTplDuration] = useState('');

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const dragEnterCountRef = useRef<Record<number, number>>({});

  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Admin resources
  const [adminResources, setAdminResources] = useState<Resource[]>([]);
  useEffect(() => {
    supabase.from('resources').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setAdminResources((data as any[]) || []);
    });
  }, []);

  const totalDays = getDaysInMonth(new Date(selectedYear, selectedMonth));
  const selectedDate = new Date(selectedYear, selectedMonth, Math.min(selectedDay, totalDays));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTasks = getTasksForDate(dateStr);

  // Curriculum
  const studentField = profile?.student_field || null;
  const subjects = useMemo(() => getSubjectsForStudent(studentField), [studentField]);
  const topicResults = useMemo(() => searchTopics(topicSearch, studentField), [topicSearch, studentField]);

  // YouTube tasks (tasks without dates, with YT: category)
  const youtubeTasks = useMemo(() => tasks.filter(t => t.category?.startsWith('YT:') && !t.dates.includes(dateStr)), [tasks, dateStr]);

  // Pending tests (can be added as tasks)
  const pendingTests = useMemo(() => tests.filter(t => t.status === 'pending'), [tests]);

  useEffect(() => {
    const max = getDaysInMonth(new Date(selectedYear, selectedMonth));
    if (selectedDay > max) setSelectedDay(max);
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    selectedDayRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDay, selectedMonth, selectedYear]);

  const { planningHourStart = 8, planningHourEnd = 20 } = settings;
  const planningMode = settings.planningMode ?? 'timestamp';

  const hours = useMemo(() =>
    Array.from({ length: Math.max(planningHourEnd - planningHourStart + 1, 1) }, (_, i) => planningHourStart + i),
    [planningHourStart, planningHourEnd]
  );

  const tasksByHour = useMemo(() => {
    const map: Record<number, Task[]> = {};
    dayTasks.forEach(t => {
      if (t.startHour !== undefined) {
        if (!map[t.startHour]) map[t.startHour] = [];
        map[t.startHour].push(t);
      }
    });
    return map;
  }, [dayTasks]);

  const unscheduledTasks = useMemo(() =>
    dayTasks.filter(t => t.startHour === undefined),
    [dayTasks]
  );

  const sortedDayTasks = useMemo(() => {
    const completed = dayTasks.filter(t => isTaskCompleted(t.id, dateStr));
    const pending = dayTasks.filter(t => !isTaskCompleted(t.id, dateStr));
    return [...pending, ...completed];
  }, [dayTasks, dateStr, isTaskCompleted]);

  const allOtherTasks = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const oneWeekAgoStr = format(oneWeekAgo, 'yyyy-MM-dd');
    return tasks.filter(t => {
      if (t.dates.includes(dateStr)) return false;
      if (t.category?.startsWith('YT:') && t.dates.length === 0) return false; // exclude unassigned YT tasks (shown separately)
      if (dateStr < oneWeekAgoStr) return true;
      const hasRecentOrFutureDates = t.dates.length === 0 || t.dates.some(d => d >= oneWeekAgoStr);
      return hasRecentOrFutureDates;
    });
  }, [tasks, dateStr]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    addTask({
      name: newName.trim(),
      category: newCategory.trim() || undefined,
      description: newDescription.trim() || undefined,
      plannedDuration: newDuration ? parseInt(newDuration) : undefined,
      startHour: newStartHour && newStartHour !== 'none' ? parseInt(newStartHour) : (pendingHour ?? undefined),
      dates: [dateStr],
    });
    resetForm();
    closeFab();
  };

  const handleCreateFromTopic = (topicName: string, subjectName: string) => {
    addTask({
      name: topicName,
      category: subjectName,
      startHour: pendingHour ?? undefined,
      dates: [dateStr],
    });
    setTopicSearch('');
    closeFab();
  };

  const handleCreateFromTemplate = (tpl: TaskTemplate) => {
    addTask({ name: tpl.name, category: tpl.category, plannedDuration: tpl.plannedDuration, startHour: pendingHour ?? tpl.startHour, dates: [dateStr] });
    closeFab();
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim()) return;
    addTemplate({ name: tplName.trim(), category: tplCategory.trim() || undefined, plannedDuration: tplDuration ? parseInt(tplDuration) : undefined });
    setTplName(''); setTplCategory(''); setTplDuration('');
    setTemplateSubMode('menu');
    toast.success('Şablon kaydedildi');
  };

  const handleCreateAtHour = (hour: number) => {
    setPendingHour(hour);
    setNewStartHour(String(hour));
    setDrawerTab('tasks');
    setTaskSubMode('menu');
    setFabOpen(true);
  };

  const handleAddExistingAtHour = (hour: number) => {
    setPendingHour(hour);
    setDrawerTab('tasks');
    setTaskSubMode('existing');
    setFabOpen(true);
  };

  const handleAddExistingTask = (task: Task) => {
    if (task.dates.includes(dateStr)) {
      // Just update hour
      updateTask(task.id, { startHour: pendingHour ?? undefined });
    } else {
      updateTask(task.id, { dates: [...task.dates, dateStr], startHour: pendingHour ?? undefined });
    }
    closeFab();
  };

  const handleAddYoutubeTaskToDay = (task: Task) => {
    updateTask(task.id, { dates: [...task.dates, dateStr], startHour: pendingHour ?? undefined });
    toast.success('Video güne eklendi');
    closeFab();
  };

  const handleAddTestAsTask = (test: { name: string; subject: string; book_name?: string; topic?: string; estimated_duration?: number }) => {
    const parts = [test.subject];
    if (test.book_name) parts.push(test.book_name);
    if (test.topic) parts.push(test.topic);
    const taskName = `Test: ${parts.join(' • ')}`;
    const estDur = test.estimated_duration || undefined;
    addTask({
      name: taskName,
      category: test.subject,
      plannedDuration: estDur,
      startHour: pendingHour ?? undefined,
      dates: [dateStr],
    });
    // Also add analysis task
    if (estDur) {
      addTask({
        name: `Analiz: ${parts.join(' • ')}`,
        category: test.subject,
        startHour: undefined,
        dates: [dateStr],
      });
    }
    toast.success('Test ve analiz görevi eklendi');
    closeFab();
  };

  const handleAddResourceToDay = (resource: Resource) => {
    addTask({
      name: resource.title,
      category: resource.category || 'Kaynak',
      description: resource.url || resource.description || undefined,
      startHour: pendingHour ?? undefined,
      dates: [dateStr],
    });
    toast.success('Kaynak güne eklendi');
    closeFab();
  };

  const closeFab = () => {
    setFabOpen(false);
    setDrawerTab('tasks');
    setTaskSubMode('menu');
    setTemplateSubMode('menu');
    setResourceSubMode('menu');
    setPendingHour(null);
  };

  const resetForm = () => {
    setNewName(''); setNewCategory(''); setNewDuration(''); setNewStartHour('');
    setPendingHour(null); setTopicSearch(''); setNewDescription('');
  };

  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleDragEnd = () => { setDraggedTaskId(null); setDragOverHour(null); dragEnterCountRef.current = {}; };
  const handleDragEnter = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    dragEnterCountRef.current[hour] = (dragEnterCountRef.current[hour] || 0) + 1;
    setDragOverHour(hour);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragLeave = (hour: number) => {
    dragEnterCountRef.current[hour] = (dragEnterCountRef.current[hour] || 1) - 1;
    if (dragEnterCountRef.current[hour] <= 0) { dragEnterCountRef.current[hour] = 0; setDragOverHour(prev => prev === hour ? null : prev); }
  };
  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    if (draggedTaskId) updateTask(draggedTaskId, { startHour: hour });
    setDraggedTaskId(null); setDragOverHour(null); dragEnterCountRef.current = {};
  };

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

  const dayList = buildDayList();
  const handleDaySelect = (entry: { day: number; month: number; year: number }) => {
    setSelectedDay(entry.day); setSelectedMonth(entry.month); setSelectedYear(entry.year);
  };
  const dayOfWeek = dayNames[selectedDate.getDay()];

  const isYKS = settings.useCase === 'university';

  return (
    <div className="px-4 pt-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-foreground">Planlama</h1>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-bold text-foreground">{selectedDay}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-foreground font-medium hover:text-primary transition-colors">{monthNames[selectedMonth]}</button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 pointer-events-auto" align="end">
              <div className="grid grid-cols-3 gap-1">
                {monthNames.map((name, i) => (
                  <button key={i} onClick={() => setSelectedMonth(i)} className={`text-xs py-1.5 rounded-lg transition-colors ${selectedMonth === i ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>{name.slice(0, 3)}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><ChevronLeft size={14} /></button>
            <span className="font-medium text-foreground tabular-nums min-w-[36px] text-center">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"><ChevronRight size={14} /></button>
          </div>
          <span className="text-xs text-muted-foreground">{dayOfWeek}</span>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 -mx-4 px-4 pb-1" onTouchStart={e => e.stopPropagation()}>
        {dayList.map((entry, idx) => {
          const d = new Date(entry.year, entry.month, entry.day);
          const isSelected = entry.day === selectedDay && entry.month === selectedMonth && entry.year === selectedYear;
          const isToday = entry.day === now.getDate() && entry.month === now.getMonth() && entry.year === now.getFullYear();
          const isOtherMonth = entry.type !== 'curr';
          return (
            <button
              key={`${entry.year}-${entry.month}-${entry.day}-${idx}`}
              ref={isSelected ? selectedDayRef : undefined}
              onClick={() => handleDaySelect(entry)}
              className={`flex flex-col items-center min-w-[40px] py-2 px-1 rounded-xl transition-all ${
                isSelected ? 'bg-primary text-primary-foreground'
                : isToday ? 'bg-accent text-accent-foreground'
                : isOtherMonth ? 'text-muted-foreground/40 hover:bg-accent/30'
                : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              <span className="text-[9px] font-medium">{dayNames[d.getDay()]}</span>
              <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{entry.day}</span>
              {isOtherMonth && <span className="text-[8px] opacity-60">{monthNames[entry.month].slice(0, 3)}</span>}
            </button>
          );
        })}
      </div>

      {/* LIST MODE */}
      {planningMode === 'list' ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
          {sortedDayTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Bu gün için görev yok.</p>
            </div>
          )}
          {sortedDayTasks.map(task => (
            <TaskCard key={task.id} task={task} dateStr={dateStr} isCompleted={isTaskCompleted(task.id, dateStr)} onToggle={() => toggleTaskCompletion(task.id, dateStr)} onDelete={() => handleDeleteTask(task.id)} />
          ))}
        </div>
      ) : (
        /* TIMESTAMP MODE */
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {unscheduledTasks.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wide">Zamanlanmamış</p>
              <div className="space-y-1.5">
                {unscheduledTasks.map(task => (
                  <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-50' : ''}`}>
                    <TaskCard task={task} dateStr={dateStr} isCompleted={isTaskCompleted(task.id, dateStr)} onToggle={() => toggleTaskCompletion(task.id, dateStr)} onDelete={() => handleDeleteTask(task.id)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hours.map(hour => {
            const hourTasks = tasksByHour[hour] || [];
            const isDragTarget = dragOverHour === hour;
            const minH = hourTasks.length > 0 ? `${Math.max(56, hourTasks.length * 52 + 16)}px` : '56px';
            return (
              <div key={hour} className={`relative flex border-t border-border/50 transition-colors ${isDragTarget ? 'bg-primary/5' : ''}`} style={{ minHeight: minH }}
                onDragEnter={(e) => handleDragEnter(e, hour)} onDragOver={handleDragOver} onDragLeave={() => handleDragLeave(hour)} onDrop={(e) => handleDrop(e, hour)}>
                <div className="w-12 pt-1.5 text-[11px] text-muted-foreground font-medium shrink-0">{String(hour).padStart(2, '0')}:00</div>
                <div className="flex-1 py-1.5 space-y-1.5 pr-8">
                  {hourTasks.map(task => (
                    <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-40' : ''}`}>
                      <TaskCard task={task} dateStr={dateStr} isCompleted={isTaskCompleted(task.id, dateStr)} onToggle={() => toggleTaskCompletion(task.id, dateStr)} onDelete={() => handleDeleteTask(task.id)} compact />
                    </div>
                  ))}
                  {isDragTarget && draggedTaskId && <div className="absolute inset-1 border-2 border-dashed border-primary/60 rounded-xl pointer-events-none" />}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="absolute top-1.5 right-1 p-1 text-muted-foreground/40 hover:text-primary transition-colors"><Plus size={14} /></button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1.5 pointer-events-auto" align="end" side="left">
                    <button onClick={() => handleCreateAtHour(hour)} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
                      <Plus size={13} className="text-primary" /> Yeni Görev
                    </button>
                    {(unscheduledTasks.length > 0 || allOtherTasks.length > 0) && (
                      <button onClick={() => handleAddExistingAtHour(hour)} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors">
                        <List size={13} className="text-primary" /> Mevcut Görev
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => { resetForm(); setDrawerTab('tasks'); setTaskSubMode('menu'); setTemplateSubMode('menu'); setResourceSubMode('menu'); setFabOpen(true); }}
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-10">
        <Plus size={22} />
      </button>

      {/* Drawer */}
      <Drawer open={fabOpen} onOpenChange={(open) => { if (!open) closeFab(); else setFabOpen(true); }}>
        <DrawerContent className="max-h-[75vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>
              Görev Ekle{pendingHour !== null ? ` — ${String(pendingHour).padStart(2, '0')}:00` : ''}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <Tabs value={drawerTab} onValueChange={v => { setDrawerTab(v as any); setTaskSubMode('menu'); setTemplateSubMode('menu'); setResourceSubMode('menu'); }}>
              <TabsList className="grid w-full grid-cols-3 h-9 rounded-xl mb-3">
                <TabsTrigger value="tasks" className="text-xs rounded-lg">Görevler</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs rounded-lg">Şablonlar</TabsTrigger>
                <TabsTrigger value="resources" className="text-xs rounded-lg">Kaynaklar</TabsTrigger>
              </TabsList>

              {/* ─── GÖREVLER TAB ─── */}
              <TabsContent value="tasks" className="space-y-3 mt-0">
                {taskSubMode === 'menu' && (
                  <>
                    {isYKS && (
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                          <Input value={topicSearch} onChange={e => setTopicSearch(e.target.value)} placeholder="Konu ara (ör: Türev, Paragraf...)" className="pl-8 rounded-xl text-sm" />
                        </div>
                        {topicSearch && topicResults.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-0.5 bg-muted rounded-xl p-1.5">
                            {topicResults.map(t => (
                              <button key={t.id} onClick={() => handleCreateFromTopic(t.name, t.subject)}
                                className="w-full text-left text-xs px-2.5 py-2 rounded-lg hover:bg-accent transition-colors">
                                {t.name} <span className="text-muted-foreground">– {t.subject}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => setTaskSubMode('new')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      <Plus size={16} className="text-primary" /> Yeni Görev
                    </button>
                    <button onClick={() => setTaskSubMode('existing')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      📋 Mevcut Görevden Ekle
                    </button>
                  </>
                )}

                {taskSubMode === 'new' && (
                  <div className="space-y-3">
                    <Input placeholder="Görev adı *" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} className="rounded-xl" autoFocus />
                    {isYKS ? (
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Ders seç (opsiyonel)" /></SelectTrigger>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Kategori (opsiyonel)" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="rounded-xl" />
                    )}
                    <Input type="number" placeholder="Süre - dk (opsiyonel)" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="rounded-xl" />
                    <Input placeholder="Link veya açıklama (opsiyonel)" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="rounded-xl" />
                    {planningMode === 'timestamp' && (
                      <Select value={newStartHour} onValueChange={setNewStartHour}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Saat (opsiyonel)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Zamansız</SelectItem>
                          {hours.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full rounded-xl">Oluştur</Button>
                  </div>
                )}

                {taskSubMode === 'existing' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unscheduledTasks.length === 0 && allOtherTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Eklenebilecek görev yok</p>
                    )}
                    {unscheduledTasks.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground">Bu günün zamanlanmamış görevleri</p>
                        {unscheduledTasks.map(task => (
                          <button key={task.id} onClick={() => {
                            if (pendingHour !== null) updateTask(task.id, { startHour: pendingHour });
                            closeFab();
                          }} className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                            {task.name}
                          </button>
                        ))}
                      </>
                    )}
                    {allOtherTasks.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground mt-2">Diğer görevler</p>
                        {allOtherTasks.slice(0, 10).map(task => (
                          <button key={task.id} onClick={() => handleAddExistingTask(task)} className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                            {task.name}
                            {task.category && <span className="ml-2 text-xs text-muted-foreground">• {task.category}</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ─── ŞABLONLAR TAB ─── */}
              <TabsContent value="templates" className="space-y-3 mt-0">
                {templateSubMode === 'menu' && (
                  <>
                    <button onClick={() => setTemplateSubMode('create')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      🔖 Yeni Şablon Oluştur
                    </button>
                    <button onClick={() => setTemplateSubMode('use')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      ✨ Şablon Kullan
                    </button>
                  </>
                )}

                {templateSubMode === 'create' && (
                  <div className="space-y-3">
                    <Input placeholder="Şablon adı *" value={tplName} onChange={e => setTplName(e.target.value)} className="rounded-xl" autoFocus />
                    <Input placeholder="Kategori (opsiyonel)" value={tplCategory} onChange={e => setTplCategory(e.target.value)} className="rounded-xl" />
                    <Input type="number" placeholder="Süre - dk (opsiyonel)" value={tplDuration} onChange={e => setTplDuration(e.target.value)} className="rounded-xl" />
                    <Button onClick={handleSaveTemplate} disabled={!tplName.trim()} className="w-full rounded-xl">Kaydet</Button>
                  </div>
                )}

                {templateSubMode === 'use' && (
                  <div className="space-y-2">
                    {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Henüz şablon yok</p>}
                    {templates.map(tpl => (
                      <div key={tpl.id} className="flex items-center gap-2">
                        <button onClick={() => handleCreateFromTemplate(tpl)} className="flex-1 text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                          {tpl.name}
                          {tpl.category && <span className="ml-2 text-xs text-muted-foreground">• {tpl.category}</span>}
                          {tpl.plannedDuration && <span className="ml-2 text-xs text-muted-foreground">{tpl.plannedDuration}dk</span>}
                        </button>
                        <button onClick={() => deleteTemplate(tpl.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ─── KAYNAKLAR TAB ─── */}
              <TabsContent value="resources" className="space-y-3 mt-0">
                {resourceSubMode === 'menu' && (
                  <>
                    <button onClick={() => setResourceSubMode('admin')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      <BookOpen size={16} className="text-primary" /> Admin Kaynakları
                    </button>
                    <button onClick={() => setResourceSubMode('youtube')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      <Youtube size={16} className="text-destructive" /> YouTube Video Ekle
                    </button>
                    <button onClick={() => setResourceSubMode('test')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                      <ClipboardList size={16} className="text-primary" /> Test Ekle
                    </button>
                  </>
                )}

                {resourceSubMode === 'admin' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {adminResources.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Admin kaynağı yok</p>}
                    {adminResources.map(res => (
                      <button key={res.id} onClick={() => handleAddResourceToDay(res)} className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                        {res.title}
                        {res.category && <span className="ml-2 text-xs text-muted-foreground">• {res.category}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {resourceSubMode === 'youtube' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {youtubeTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tanımlı video yok. Yardımcı Kaynaklar'dan playlist ekleyin.
                      </p>
                    )}
                    {youtubeTasks.map(task => (
                      <button key={task.id} onClick={() => handleAddYoutubeTaskToDay(task)} className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                        <span className="truncate block">{task.name}</span>
                        {task.category && <span className="text-[10px] text-muted-foreground">{task.category.replace('YT:', '')}</span>}
                      </button>
                    ))}
                  </div>
                )}

                {resourceSubMode === 'test' && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pendingTests.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Bekleyen test yok. Yardımcı Kaynaklar'dan test tanımlayın.
                      </p>
                    )}
                    {pendingTests.map(test => (
                      <button key={test.id} onClick={() => handleAddTestAsTask(test)} className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border">
                        {test.name}
                        <span className="ml-2 text-xs text-muted-foreground">• {test.subject}</span>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function TaskCard({ task, dateStr, isCompleted, onToggle, onDelete, compact }: {
  task: Task; dateStr: string; isCompleted: boolean;
  onToggle: () => void; onDelete: () => void; compact?: boolean;
}) {
  const isTeacherTask = task.source === 'teacher';
  const hasLink = task.description && (task.description.startsWith('http') || task.description.startsWith('www.'));
  return (
    <div className={`flex items-center gap-2.5 rounded-xl ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} border shadow-sm w-full ${
      isTeacherTask ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
    }`}>
      <Checkbox checked={isCompleted} onCheckedChange={onToggle} className="rounded-md shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>{task.name}</p>
          {isTeacherTask && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">Koç</span>}
        </div>
        {(task.category || task.plannedDuration || hasLink) && (
          <div className="flex gap-2 mt-0.5 items-center">
            {task.category && <span className="text-[10px] text-muted-foreground">{task.category}</span>}
            {task.plannedDuration && <span className="text-[10px] text-muted-foreground">{task.plannedDuration} dk</span>}
            {hasLink && (
              <a href={task.description!.startsWith('http') ? task.description! : `https://${task.description}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:text-primary/80">
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"><Trash2 size={14} /></button>
    </div>
  );
}
