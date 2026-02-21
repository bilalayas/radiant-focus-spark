import { useState, useRef, useEffect, useMemo } from 'react';
import { format, getDaysInMonth, addMonths, subMonths } from 'date-fns';
import { Plus, Trash2, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
// useSupabaseTasks is now consumed via AppContext
import { useTemplates, TaskTemplate } from '@/hooks/useTemplates';
import { Task, YKS_TYT_SUBJECTS, YKS_AYT_SUBJECTS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function PlanningPage() {
  const {
    isTaskCompleted, settings, toggleTaskCompletion,
    tasks, addTask: addTaskContext, updateTask, deleteTask, getTasksForDate,
  } = useApp();

  const addTask = (task: Omit<Task, 'id'>) => { addTaskContext(task); };
  const { templates, addTemplate, deleteTemplate } = useTemplates();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const [fabOpen, setFabOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'menu' | 'new' | 'templates' | 'createTemplate' | 'addExisting'>('menu');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newStartHour, setNewStartHour] = useState<string>('');
  const [pendingHour, setPendingHour] = useState<number | null>(null);

  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('');
  const [tplDuration, setTplDuration] = useState('');

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const dragEnterCountRef = useRef<Record<number, number>>({});

  const selectedDayRef = useRef<HTMLButtonElement>(null);

  const totalDays = getDaysInMonth(new Date(selectedYear, selectedMonth));
  const selectedDate = new Date(selectedYear, selectedMonth, Math.min(selectedDay, totalDays));
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTasks = getTasksForDate(dateStr);

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

  const allOtherTasks = useMemo(() =>
    tasks.filter(t => !t.dates.includes(dateStr)),
    [tasks, dateStr]
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    addTask({
      name: newName.trim(),
      category: newCategory.trim() || undefined,
      plannedDuration: newDuration ? parseInt(newDuration) : undefined,
      startHour: newStartHour && newStartHour !== 'none' ? parseInt(newStartHour) : undefined,
      dates: [dateStr],
    });
    resetForm();
    setFabOpen(false);
    setDrawerMode('menu');
  };

  const handleCreateFromTemplate = (tpl: TaskTemplate) => {
    addTask({
      name: tpl.name,
      category: tpl.category,
      plannedDuration: tpl.plannedDuration,
      startHour: tpl.startHour,
      dates: [dateStr],
    });
    setFabOpen(false);
    setDrawerMode('menu');
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim()) return;
    addTemplate({
      name: tplName.trim(),
      category: tplCategory.trim() || undefined,
      plannedDuration: tplDuration ? parseInt(tplDuration) : undefined,
    });
    setTplName(''); setTplCategory(''); setTplDuration('');
    setDrawerMode('menu');
  };

  const handleCreateAtHour = (hour: number) => {
    setPendingHour(hour);
    setNewStartHour(String(hour));
    setDrawerMode('menu');
    setFabOpen(true);
  };

  const handleAddExistingAtHour = (hour: number) => {
    setPendingHour(hour);
    setDrawerMode('addExisting');
    setFabOpen(true);
  };

  const handleAddExistingTask = (task: Task) => {
    updateTask(task.id, { dates: [...task.dates, dateStr], startHour: pendingHour ?? undefined });
    setFabOpen(false);
    setDrawerMode('menu');
    setPendingHour(null);
  };

  const handleAddUnscheduledToHour = (task: Task, hour: number) => {
    updateTask(task.id, { startHour: hour });
  };

  const resetForm = () => {
    setNewName(''); setNewCategory(''); setNewDuration(''); setNewStartHour('');
    setPendingHour(null);
  };

  const handleDragStart = (taskId: string) => setDraggedTaskId(taskId);
  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverHour(null);
    dragEnterCountRef.current = {};
  };
  const handleDragEnter = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    dragEnterCountRef.current[hour] = (dragEnterCountRef.current[hour] || 0) + 1;
    setDragOverHour(hour);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragLeave = (hour: number) => {
    dragEnterCountRef.current[hour] = (dragEnterCountRef.current[hour] || 1) - 1;
    if (dragEnterCountRef.current[hour] <= 0) {
      dragEnterCountRef.current[hour] = 0;
      setDragOverHour(prev => prev === hour ? null : prev);
    }
  };
  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    if (draggedTaskId) updateTask(draggedTaskId, { startHour: hour });
    setDraggedTaskId(null);
    setDragOverHour(null);
    dragEnterCountRef.current = {};
  };

  const buildDayList = () => {
    const prevMonthDate = subMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const nextMonthDate = addMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const prevDays = getDaysInMonth(prevMonthDate);
    const currDays = getDaysInMonth(new Date(selectedYear, selectedMonth, 1));
    const nextDays = getDaysInMonth(nextMonthDate);

    const result: { day: number; month: number; year: number; type: 'prev' | 'curr' | 'next' }[] = [];
    for (let d = prevDays - 2; d <= prevDays; d++) {
      result.push({ day: d, month: prevMonthDate.getMonth(), year: prevMonthDate.getFullYear(), type: 'prev' });
    }
    for (let d = 1; d <= currDays; d++) {
      result.push({ day: d, month: selectedMonth, year: selectedYear, type: 'curr' });
    }
    for (let d = 1; d <= Math.min(3, nextDays); d++) {
      result.push({ day: d, month: nextMonthDate.getMonth(), year: nextMonthDate.getFullYear(), type: 'next' });
    }
    return result;
  };

  const dayList = buildDayList();

  const handleDaySelect = (entry: { day: number; month: number; year: number }) => {
    setSelectedDay(entry.day);
    setSelectedMonth(entry.month);
    setSelectedYear(entry.year);
  };

  const dayOfWeek = dayNames[selectedDate.getDay()];

  const yksSubjects = settings.useCase === 'university'
    ? [...YKS_TYT_SUBJECTS, ...YKS_AYT_SUBJECTS]
    : [];

  return (
    <div className="px-4 pt-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-foreground">Planlama</h1>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-bold text-foreground">{selectedDay}</span>

          <Popover>
            <PopoverTrigger asChild>
              <button className="text-foreground font-medium hover:text-primary transition-colors">
                {monthNames[selectedMonth]}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 pointer-events-auto" align="end">
              <div className="grid grid-cols-3 gap-1">
                {monthNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedMonth(i)}
                    className={`text-xs py-1.5 rounded-lg transition-colors ${
                      selectedMonth === i ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium text-foreground tabular-nums min-w-[36px] text-center">
              {selectedYear}
            </span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronRight size={14} />
            </button>
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
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isToday
                  ? 'bg-accent text-accent-foreground'
                  : isOtherMonth
                  ? 'text-muted-foreground/40 hover:bg-accent/30'
                  : 'text-muted-foreground hover:bg-accent/50'
              }`}
            >
              <span className="text-[9px] font-medium">{dayNames[d.getDay()]}</span>
              <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>{entry.day}</span>
              {isOtherMonth && (
                <span className="text-[8px] opacity-60">{monthNames[entry.month].slice(0, 3)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* LIST MODE */}
      {planningMode === 'list' ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2">
          {dayTasks.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Bu gün için görev yok.</p>
            </div>
          )}
          {settings.useCase === 'university' && dayTasks.length === 0 && yksSubjects.length > 0 && (
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <p className="text-xs text-muted-foreground mb-2">YKS Konuları — Hızlı Ekle</p>
              <div className="flex flex-wrap gap-1.5">
                {yksSubjects.slice(0, 8).map(subject => (
                  <button
                    key={subject}
                    onClick={() => addTask({ name: subject, dates: [dateStr], category: subject.startsWith('TYT') ? 'TYT' : 'AYT' })}
                    className="text-xs px-2.5 py-1 bg-accent text-accent-foreground rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}
          {dayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              dateStr={dateStr}
              isCompleted={isTaskCompleted(task.id, dateStr)}
              onToggle={() => toggleTaskCompletion(task.id, dateStr)}
              onDelete={() => deleteTask(task.id)}
            />
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
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
                  >
                    <TaskCard
                      task={task}
                      dateStr={dateStr}
                      isCompleted={isTaskCompleted(task.id, dateStr)}
                      onToggle={() => toggleTaskCompletion(task.id, dateStr)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {settings.useCase === 'university' && dayTasks.length === 0 && (
            <div className="bg-card rounded-2xl p-3 border border-border shadow-sm mb-3">
              <p className="text-xs text-muted-foreground mb-2">YKS Konuları — Hızlı Ekle</p>
              <div className="flex flex-wrap gap-1.5">
                {yksSubjects.slice(0, 6).map(subject => (
                  <button
                    key={subject}
                    onClick={() => addTask({ name: subject, dates: [dateStr], category: subject.startsWith('TYT') ? 'TYT' : 'AYT' })}
                    className="text-xs px-2.5 py-1 bg-accent text-accent-foreground rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hours.map(hour => {
            const hourTasks = tasksByHour[hour] || [];
            const isDragTarget = dragOverHour === hour;
            const minH = hourTasks.length > 0 ? `${Math.max(56, hourTasks.length * 52 + 16)}px` : '56px';
            return (
              <div
                key={hour}
                className={`relative flex border-t border-border/50 transition-colors ${
                  isDragTarget ? 'bg-primary/5' : ''
                }`}
                style={{ minHeight: minH }}
                onDragEnter={(e) => handleDragEnter(e, hour)}
                onDragOver={handleDragOver}
                onDragLeave={() => handleDragLeave(hour)}
                onDrop={(e) => handleDrop(e, hour)}
              >
                <div className="w-12 pt-1.5 text-[11px] text-muted-foreground font-medium shrink-0">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 py-1.5 space-y-1.5 pr-8">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-40' : ''}`}
                    >
                      <TaskCard
                        task={task}
                        dateStr={dateStr}
                        isCompleted={isTaskCompleted(task.id, dateStr)}
                        onToggle={() => toggleTaskCompletion(task.id, dateStr)}
                        onDelete={() => deleteTask(task.id)}
                        compact
                      />
                    </div>
                  ))}
                  {isDragTarget && draggedTaskId && (
                    <div className="absolute inset-1 border-2 border-dashed border-primary/60 rounded-xl pointer-events-none" />
                  )}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="absolute top-1.5 right-1 p-1 text-muted-foreground/40 hover:text-primary transition-colors">
                      <Plus size={14} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1.5 pointer-events-auto" align="end" side="left">
                    <button
                      onClick={() => handleCreateAtHour(hour)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                    >
                      <Plus size={13} className="text-primary" /> Yeni Görev
                    </button>
                    {(unscheduledTasks.length > 0 || allOtherTasks.length > 0) && (
                      <button
                        onClick={() => handleAddExistingAtHour(hour)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                      >
                        <List size={13} className="text-primary" /> Mevcut Görev Ekle
                      </button>
                    )}
                    {unscheduledTasks.length > 0 && unscheduledTasks.slice(0, 3).map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleAddUnscheduledToHour(t, hour)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      >
                        ↑ {t.name.length > 16 ? t.name.slice(0, 16) + '…' : t.name}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setDrawerMode('menu'); resetForm(); setFabOpen(true); }}
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all z-10"
      >
        <Plus size={22} />
      </button>

      {/* Drawer */}
      <Drawer open={fabOpen} onOpenChange={(open) => { setFabOpen(open); if (!open) { setDrawerMode('menu'); setPendingHour(null); } }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {drawerMode === 'menu' ? `Görev Ekle${pendingHour !== null ? ` — ${String(pendingHour).padStart(2, '0')}:00` : ''}` :
               drawerMode === 'new' ? 'Yeni Görev' :
               drawerMode === 'addExisting' ? 'Mevcut Görev Ekle' :
               drawerMode === 'templates' ? 'Şablonlar' : 'Şablon Oluştur'}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-3">
            {drawerMode === 'menu' && (
              <>
                <button onClick={() => setDrawerMode('new')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                  <Plus size={16} className="text-primary" /> Yeni Görev
                </button>
                <button onClick={() => setDrawerMode('addExisting')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                  📋 Mevcut Görevden Ekle
                </button>
                <button onClick={() => setDrawerMode('templates')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                  ✨ Şablon Kullan
                </button>
                <button onClick={() => setDrawerMode('createTemplate')} className="flex items-center gap-3 w-full px-4 py-3 bg-card rounded-xl border border-border text-sm hover:bg-accent transition-colors">
                  🔖 Şablon Oluştur
                </button>
                {settings.useCase === 'university' && yksSubjects.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">YKS Konuları</p>
                    <div className="flex flex-wrap gap-1.5">
                      {yksSubjects.map(subject => (
                        <button
                          key={subject}
                          onClick={() => {
                            addTask({ name: subject, dates: [dateStr], category: subject.startsWith('TYT') ? 'TYT' : 'AYT', startHour: pendingHour ?? undefined });
                            setFabOpen(false);
                            setDrawerMode('menu');
                            setPendingHour(null);
                          }}
                          className="text-xs px-2.5 py-1.5 bg-accent text-accent-foreground rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {drawerMode === 'addExisting' && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unscheduledTasks.length === 0 && allOtherTasks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Eklenebilecek görev yok</p>
                )}
                {unscheduledTasks.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground">Bu günün zamanlanmamış görevleri</p>
                    {unscheduledTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => {
                          if (pendingHour !== null) updateTask(task.id, { startHour: pendingHour });
                          setFabOpen(false);
                          setDrawerMode('menu');
                          setPendingHour(null);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border"
                      >
                        {task.name}
                      </button>
                    ))}
                  </>
                )}
                {allOtherTasks.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">Diğer görevler</p>
                    {allOtherTasks.slice(0, 10).map(task => (
                      <button
                        key={task.id}
                        onClick={() => handleAddExistingTask(task)}
                        className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border"
                      >
                        {task.name}
                        {task.category && <span className="ml-2 text-xs text-muted-foreground">• {task.category}</span>}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {drawerMode === 'new' && (
              <div className="space-y-3">
                <Input placeholder="Görev adı *" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} className="rounded-xl" autoFocus />
                <Input placeholder="Kategori (opsiyonel)" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="rounded-xl" />
                <Input type="number" placeholder="Süre - dk (opsiyonel)" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="rounded-xl" />
                <Select value={newStartHour} onValueChange={setNewStartHour}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Saat (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Zamansız</SelectItem>
                    {hours.map(h => (
                      <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreate} disabled={!newName.trim()} className="w-full rounded-xl">Oluştur</Button>
              </div>
            )}

            {drawerMode === 'templates' && (
              <div className="space-y-2">
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Henüz şablon yok</p>
                )}
                {templates.map(tpl => (
                  <div key={tpl.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleCreateFromTemplate(tpl)}
                      className="flex-1 text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors border border-border"
                    >
                      {tpl.name}
                      {tpl.category && <span className="ml-2 text-xs text-muted-foreground">• {tpl.category}</span>}
                      {tpl.plannedDuration && <span className="ml-2 text-xs text-muted-foreground">{tpl.plannedDuration}dk</span>}
                    </button>
                    <button onClick={() => deleteTemplate(tpl.id)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {drawerMode === 'createTemplate' && (
              <div className="space-y-3">
                <Input placeholder="Şablon adı *" value={tplName} onChange={e => setTplName(e.target.value)} className="rounded-xl" autoFocus />
                <Input placeholder="Kategori (opsiyonel)" value={tplCategory} onChange={e => setTplCategory(e.target.value)} className="rounded-xl" />
                <Input type="number" placeholder="Süre - dk (opsiyonel)" value={tplDuration} onChange={e => setTplDuration(e.target.value)} className="rounded-xl" />
                <Button onClick={handleSaveTemplate} disabled={!tplName.trim()} className="w-full rounded-xl">Kaydet</Button>
              </div>
            )}
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
  return (
    <div className={`flex items-center gap-2.5 bg-card rounded-xl ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} border border-border shadow-sm w-full`}>
      <Checkbox checked={isCompleted} onCheckedChange={onToggle} className="rounded-md shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
          {task.name}
        </p>
        {(task.category || task.plannedDuration) && (
          <div className="flex gap-2 mt-0.5">
            {task.category && <span className="text-[10px] text-muted-foreground">{task.category}</span>}
            {task.plannedDuration && <span className="text-[10px] text-muted-foreground">{task.plannedDuration} dk</span>}
          </div>
        )}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
