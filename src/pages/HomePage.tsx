import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Coffee, Play, Plus, Search, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const today = () => format(new Date(), 'yyyy-MM-dd');

const MOTIVASYON_SOZLERI = [
  "Mola sonrası zihin daha güçlü döner. 💪",
  "Dinlen, sonra daha iyisini yap. 🌱",
  "Her büyük başarı küçük molalarla beslenir. ☕",
  "Biraz nefes al, odaklanmaya hazırlan. 🎯",
  "Yorgunluk geçer, başarı kalır. ✨",
  "Şimdi dinlen, sonra parla. 🌟",
  "En iyi fikirler molada gelir. 💡",
  "Beynini şarj et, daha hızlı uç. 🚀",
  "Sabır ve dinginlik, gücün kaynağı. 🌊",
  "Bu molayı hak ettin. Aferin sana! 🎉",
];

const BREAK_STORAGE_KEY = 'takipcim_break_state';

function saveBreakToStorage(breakStart: number) {
  localStorage.setItem(BREAK_STORAGE_KEY, JSON.stringify({ isOnBreak: true, breakStart }));
}

function clearBreakFromStorage() {
  localStorage.removeItem(BREAK_STORAGE_KEY);
}

function loadBreakFromStorage(): { isOnBreak: boolean; breakStart: number | null } {
  try {
    const raw = localStorage.getItem(BREAK_STORAGE_KEY);
    if (!raw) return { isOnBreak: false, breakStart: null };
    const data = JSON.parse(raw);
    if (data.isOnBreak && data.breakStart) {
      return { isOnBreak: true, breakStart: data.breakStart };
    }
  } catch {
    // ignore
  }
  return { isOnBreak: false, breakStart: null };
}

// ─── Swipe Finish Component ─────────────────────────────────
function SwipeFinish({ onEndSession, onCompleteTask, onCancel }: {
  onEndSession: () => void;
  onCompleteTask: () => void;
  onCancel: () => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const trackWidth = useRef(0);

  const THRESHOLD = 0.6; // %60 mesafe

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    if (containerRef.current) {
      trackWidth.current = containerRef.current.offsetWidth / 2 - 28; // half minus handle
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || completed) return;
    const diff = e.clientX - startXRef.current;
    // Clamp between -trackWidth and +trackWidth
    const clamped = Math.max(-trackWidth.current, Math.min(trackWidth.current, diff));
    setDragX(clamped);
  };

  const handlePointerUp = () => {
    if (!isDragging || completed) return;
    setIsDragging(false);

    const progress = Math.abs(dragX) / trackWidth.current;

    if (progress >= THRESHOLD) {
      // Complete the action
      setCompleted(true);
      const finalX = dragX > 0 ? trackWidth.current : -trackWidth.current;
      setDragX(finalX);

      setTimeout(() => {
        if (dragX > 0) {
          onEndSession(); // sağa = oturumu bitir
        } else {
          onCompleteTask(); // sola = görevi bitir
        }
      }, 300);
    } else {
      // Snap back
      setDragX(0);
    }
  };

  const progress = trackWidth.current > 0 ? dragX / trackWidth.current : 0;
  const leftOpacity = Math.max(0, -progress); // sola giderken kırmızı opacity
  const rightOpacity = Math.max(0, progress); // sağa giderken mavi opacity

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        // Overlay'e tıklanırsa kapat
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Swipe Area */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-[90%] max-w-sm"
      >
        <div
          ref={containerRef}
          className="relative h-16 bg-card rounded-2xl border border-border shadow-xl overflow-hidden select-none"
        >
          {/* Left zone - Görevi Bitir (red) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/2 flex items-center justify-start pl-4 transition-opacity"
            style={{ opacity: leftOpacity }}
          >
            <span className="text-xs font-semibold text-destructive">🔴 Görevi Bitir</span>
          </div>

          {/* Right zone - Oturumu Bitir (blue) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end pr-4 transition-opacity"
            style={{ opacity: rightOpacity }}
          >
            <span className="text-xs font-semibold text-primary">Oturumu Bitir 🔵</span>
          </div>

          {/* Center labels when idle */}
          {!isDragging && dragX === 0 && (
            <>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-destructive/50 font-medium">
                ← Görevi Bitir
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary/50 font-medium">
                Oturumu Bitir →
              </div>
            </>
          )}

          {/* Handle */}
          <div
            className="absolute top-1/2 left-1/2 -translate-y-1/2 w-14 h-12 rounded-xl bg-primary shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
            style={{
              transform: `translate(calc(-50% + ${dragX}px), -50%)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-5 bg-primary-foreground/60 rounded-full" />
              <div className="w-0.5 h-5 bg-primary-foreground/60 rounded-full" />
              <div className="w-0.5 h-5 bg-primary-foreground/60 rounded-full" />
            </div>
          </div>

          {/* Progress indicator */}
          {Math.abs(progress) > 0.1 && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground tabular-nums">
              {Math.round(Math.abs(progress) * 100)}%
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Kaydır veya vazgeçmek için dışarı dokun
        </p>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const {
    tasks, getTasksForDate, addTask, addTaskToDate, addSession,
    getSessionsForDate, setTaskCompleted, isTaskCompleted, settings,
    timer,
  } = useApp();

  const [accordionOpen, setAccordionOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);

  const [showBreakDialog1, setShowBreakDialog1] = useState(false);

  // ─── Mola state — persist to localStorage ─────────────────
  const savedBreak = loadBreakFromStorage();
  const [isOnBreak, setIsOnBreak] = useState(savedBreak.isOnBreak);
  const [breakStart, setBreakStart] = useState<number | null>(savedBreak.breakStart);
  const [breakElapsed, setBreakElapsed] = useState(() => {
    if (savedBreak.isOnBreak && savedBreak.breakStart) {
      return Math.floor((Date.now() - savedBreak.breakStart) / 1000);
    }
    return 0;
  });

  const [summaryIndex, setSummaryIndex] = useState(0);
  const [summaryTouchX, setSummaryTouchX] = useState<number | null>(null);

  // ─── Swipe finish state ────────────────────────────────────
  const [showSwipeFinish, setShowSwipeFinish] = useState(false);

  const [motivasyonSozu] = useState(() =>
    MOTIVASYON_SOZLERI[Math.floor(Math.random() * MOTIVASYON_SOZLERI.length)]
  );

  const todayStr = today();
  const todayTasks = getTasksForDate(todayStr);
  const todaySessions = getSessionsForDate(todayStr);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  useEffect(() => {
    if (timer.currentTaskId && !selectedTaskId) {
      setSelectedTaskId(timer.currentTaskId);
    }
  }, [timer.currentTaskId, selectedTaskId]);

  // Break elapsed ticker
  useEffect(() => {
    if (!isOnBreak || !breakStart) return;
    const interval = setInterval(() => {
      setBreakElapsed(Math.floor((Date.now() - breakStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, breakStart]);

  const workSessions = todaySessions.filter(s => s.type === 'work');
  const breakSessions = todaySessions.filter(s => s.type === 'break');
  const totalWork = workSessions.reduce((sum, s) => sum + s.duration, 0);
  const totalBreak = breakSessions.reduce((sum, s) => sum + s.duration, 0) + (isOnBreak ? breakElapsed : 0);
  const completedCount = todayTasks.filter(t => isTaskCompleted(t.id, todayStr)).length;

  const unplannedTasks = tasks.filter(t => !t.dates.includes(todayStr));
  const filteredUnplanned = searchQuery
    ? unplannedTasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : unplannedTasks;

  const selectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setAccordionOpen(false);
    setSheetOpen(false);
  };

  const handleStart = () => {
    if (!selectedTask) return;
    timer.start(selectedTask.id, selectedTask.name);
  };

  const saveSessionAndStop = () => {
    const duration = timer.stop();
    if (selectedTask && duration > 0) {
      addSession({
        taskId: selectedTask.id, taskName: selectedTask.name,
        date: todayStr, duration, type: 'work', timestamp: Date.now(),
      });
    }
    return duration;
  };

  const endSession = () => {
    saveSessionAndStop();
    timer.reset();
    setShowSwipeFinish(false);
    setSelectedTaskId(null);
  };

  const completeTask = () => {
    saveSessionAndStop();
    if (selectedTask) {
      setTaskCompleted(selectedTask.id, todayStr, true);
    }
    timer.reset();
    setShowSwipeFinish(false);
    setSelectedTaskId(null);
  };

  const handleBitirClick = () => {
    setShowSwipeFinish(true);
  };

  const handleSwipeCancel = () => {
    setShowSwipeFinish(false);
    // Timer devam ediyor, hiçbir işlem tetiklenmiyor
  };

  const handleBreakClick = () => {
    if (timer.isRunning) setShowBreakDialog1(true);
  };

  const startBreak = () => {
    const duration = timer.stop();
    if (selectedTask && duration > 0) {
      addSession({
        taskId: selectedTask.id, taskName: selectedTask.name,
        date: todayStr, duration, type: 'work', timestamp: Date.now(),
      });
    }
    timer.reset();
    const now = Date.now();
    setIsOnBreak(true);
    setBreakStart(now);
    setBreakElapsed(0);
    saveBreakToStorage(now);
  };

  const endBreak = () => {
    if (breakElapsed > 0) {
      addSession({
        taskId: selectedTask?.id || 'break', taskName: 'Mola',
        date: todayStr, duration: breakElapsed, type: 'break', timestamp: Date.now(),
      });
    }
    setIsOnBreak(false);
    setBreakStart(null);
    setBreakElapsed(0);
    clearBreakFromStorage();
  };

  const handleAddUnplannedTask = (taskId: string) => {
    addTaskToDate(taskId, todayStr);
    selectTask(taskId);
  };

  const handleCreateNewTask = () => {
    if (!newTaskName.trim()) return;
    const task = addTask({ name: newTaskName.trim(), dates: [todayStr] });
    setNewTaskName('');
    setShowNewTaskInput(false);
    selectTask(task.id);
  };

  const handleFreeWork = () => {
    let freeTask = tasks.find(t => t.name === 'Serbest Çalışma');
    if (!freeTask) {
      freeTask = addTask({ name: 'Serbest Çalışma', dates: [todayStr] });
    } else if (!freeTask.dates.includes(todayStr)) {
      addTaskToDate(freeTask.id, todayStr);
    }
    selectTask(freeTask.id);
  };

  // Timer ring
  const ringSize = 200;
  const strokeW = 5;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const isHourMode = timer.elapsed >= 3600;
  const ringProgress = isHourMode
    ? (timer.elapsed % 3600) / 3600
    : (timer.elapsed % 60) / 60;
  const dashOffset = circumference * (1 - ringProgress);
  const breakRingProgress = (breakElapsed % 60) / 60;
  const breakDashOffset = circumference * (1 - breakRingProgress);

  // Summary swipe
  const handleSummaryTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (summaryTouchX === null) return;
    const diff = summaryTouchX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      setSummaryIndex(prev => {
        if (diff > 0) return Math.min(prev + 1, 2);
        return Math.max(prev - 1, 0);
      });
    }
    setSummaryTouchX(null);
  };

  const avgBreakSecs = breakSessions.length > 0
    ? Math.round(totalBreak / breakSessions.length)
    : 0;

  return (
    <div className="px-4 pt-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* TOP: Accordion */}
      <div className="relative z-20 mb-2">
        <button
          onClick={() => setAccordionOpen(!accordionOpen)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-sm font-semibold text-foreground">Bugün Planlanan Görevler</h2>
          <ChevronDown
            size={18}
            className={`text-muted-foreground transition-transform duration-200 ${accordionOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {accordionOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 z-30 overflow-hidden"
            >
              <div className="mt-1 bg-background/95 backdrop-blur-sm rounded-2xl border border-border shadow-lg p-3 space-y-1.5">
                {todayTasks.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">Bugün için görev planlanmamış.</p>
                )}
                {todayTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => selectTask(task.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      selectedTaskId === task.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-card text-card-foreground hover:bg-accent'
                    } ${isTaskCompleted(task.id, todayStr) ? 'line-through opacity-50' : ''}`}
                  >
                    {task.name}
                    {task.category && (
                      <span className="ml-2 text-xs text-muted-foreground">• {task.category}</span>
                    )}
                  </button>
                ))}
                <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
                  <DrawerTrigger asChild>
                    <button className="w-full text-center text-xs text-primary font-medium py-2 hover:underline">
                      Daha Fazla
                    </button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader><DrawerTitle>Görev Ekle</DrawerTitle></DrawerHeader>
                    <div className="px-4 pb-8 space-y-3">
                      {filteredUnplanned.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Bugün planlanmayan görevler</p>
                          <div className="space-y-1">
                            {filteredUnplanned.slice(0, 5).map(t => (
                              <button
                                key={t.id}
                                onClick={() => handleAddUnplannedTask(t.id)}
                                className="w-full text-left px-3 py-2.5 bg-card rounded-xl text-sm hover:bg-accent transition-colors"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Görev ara..." className="pl-9" />
                      </div>
                      {showNewTaskInput ? (
                        <div className="flex gap-2">
                          <Input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Görev adı" onKeyDown={e => e.key === 'Enter' && handleCreateNewTask()} autoFocus />
                          <Button size="sm" onClick={handleCreateNewTask}>Ekle</Button>
                        </div>
                      ) : (
                        <button onClick={() => setShowNewTaskInput(true)} className="flex items-center gap-2 w-full px-3 py-2.5 bg-accent rounded-xl text-sm text-accent-foreground hover:opacity-80 transition-opacity">
                          <Plus size={16} /> Yeni görev oluştur
                        </button>
                      )}
                      <button onClick={handleFreeWork} className="flex items-center gap-2 w-full px-3 py-2.5 bg-accent rounded-xl text-sm text-accent-foreground hover:opacity-80 transition-opacity">
                        <Zap size={16} /> Serbest çalışma
                      </button>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected task indicator */}
      {selectedTask && !timer.isRunning && timer.elapsed === 0 && !isOnBreak && (
        <div className="text-center mb-3">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {selectedTask.name}
          </span>
        </div>
      )}
      {timer.currentTaskName && (timer.isRunning || timer.elapsed > 0) && (
        <div className="text-center mb-3">
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {timer.currentTaskName}
          </span>
        </div>
      )}
      {isOnBreak && (
        <div className="text-center mb-3">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
            ☕ Mola
          </span>
        </div>
      )}

      {/* MIDDLE: TIMER */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        {isOnBreak ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeW} />
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={strokeW} strokeDasharray={circumference}
                  strokeDashoffset={breakDashOffset}
                  strokeLinecap="round" className="transition-all duration-700 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-3xl">☕</span>
                <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {timer.formatTime(breakElapsed)}
                </span>
                <span className="text-xs text-muted-foreground">mola</span>
              </div>
            </div>
            <div className="bg-card rounded-2xl px-5 py-3 border border-border shadow-sm max-w-xs text-center">
              <p className="text-sm font-medium text-foreground leading-relaxed">{motivasyonSozu}</p>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="transform -rotate-90">
              <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeW} />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={strokeW} strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round" className="transition-all duration-700 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {timer.formatTime(timer.elapsed)}
              </span>
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="mt-4 w-full max-w-xs space-y-2">
          {isOnBreak ? (
            <Button onClick={endBreak} className="w-full h-11 text-base font-semibold rounded-2xl" size="lg">
              Çalışmaya Dön
            </Button>
          ) : !timer.isRunning && timer.elapsed === 0 ? (
            <Button onClick={handleStart} disabled={!selectedTaskId} className="w-full h-12 text-lg font-bold rounded-2xl" size="lg">
              <Play size={20} className="mr-2" /> BAŞLAT
            </Button>
          ) : (
            <div className="space-y-1.5">
              {!showSwipeFinish && (
                <div className="flex gap-3">
                  {timer.isRunning ? (
                    <Button onClick={() => timer.pause()} variant="outline" className="flex-1 h-11 rounded-2xl font-semibold">
                      DURDUR
                    </Button>
                  ) : (
                    <Button onClick={() => timer.resume()} variant="outline" className="flex-1 h-11 rounded-2xl font-semibold">
                      DEVAM
                    </Button>
                  )}
                  <Button
                    onClick={handleBitirClick}
                    className="flex-1 h-11 rounded-2xl font-semibold bg-primary text-primary-foreground"
                  >
                    BİTİR
                  </Button>
                </div>
              )}
            </div>
          )}

          {(timer.isRunning || (timer.elapsed > 0 && !isOnBreak)) && !showSwipeFinish && (
            <button onClick={handleBreakClick} className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
              <Coffee size={14} /> Molaya mı ihtiyacın var?
            </button>
          )}

          {!selectedTaskId && !isOnBreak && timer.elapsed === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Başlamak için yukarıdan bir görev seç
            </p>
          )}
        </div>
      </div>

      {/* BOTTOM: Day Summary Carousel */}
      <div className="mt-2 pb-1 shrink-0">
        <div
          className="relative overflow-hidden"
          onTouchStart={e => { e.stopPropagation(); setSummaryTouchX(e.touches[0].clientX); }}
          onTouchEnd={handleSummaryTouchEnd}
        >
          <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${summaryIndex * 100}%)` }}>
            {/* Slide 1: Çalışma Özeti */}
            <div className="w-full flex-shrink-0 px-1">
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border h-[120px] flex flex-col justify-between">
                <p className="text-xs text-muted-foreground">Çalışma Özeti</p>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-medium text-primary">{workSessions.length}</span>
                    <span className="text-xs text-muted-foreground">oturum tamamlandı</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xl font-bold text-foreground">{timer.formatTime(totalWork)}</span>
                    <span className="text-xs text-muted-foreground">toplam çalışma</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${workSessions.length > 0 ? Math.min((totalWork / 14400) * 100, 100) : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Slide 2: Mola Bilgisi */}
            <div className="w-full flex-shrink-0 px-1">
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border h-[120px] flex flex-col justify-between">
                <p className="text-xs text-muted-foreground">Mola Bilgisi</p>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xl font-bold text-foreground">{breakSessions.length}</span>
                    <span className="text-xs text-muted-foreground">mola yapıldı</span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-base font-medium text-muted-foreground">{timer.formatTime(avgBreakSecs)}</span>
                    <span className="text-xs text-muted-foreground">ort. mola süresi</span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-muted-foreground/40 rounded-full transition-all duration-500" style={{ width: `${totalWork + totalBreak > 0 ? (totalBreak / (totalWork + totalBreak)) * 100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Slide 3: Görev İlerlemesi */}
            <div className="w-full flex-shrink-0 px-1">
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border h-[120px] flex flex-col justify-between">
                <p className="text-xs text-muted-foreground">Görev İlerlemesi</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-xl font-bold text-foreground">{completedCount}</span>
                  <span className="text-base text-muted-foreground">/ {todayTasks.length}</span>
                  <span className="text-xs text-muted-foreground ml-1">tamamlandı</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setSummaryIndex(i)} className={`h-1.5 rounded-full transition-all duration-200 ${summaryIndex === i ? 'bg-primary w-4' : 'bg-muted-foreground/30 w-1.5'}`} />
          ))}
        </div>
      </div>

      {/* Swipe Finish Overlay */}
      <AnimatePresence>
        {showSwipeFinish && (
          <SwipeFinish
            onEndSession={endSession}
            onCompleteTask={completeTask}
            onCancel={handleSwipeCancel}
          />
        )}
      </AnimatePresence>

      {/* Break Dialog */}
      <AlertDialog open={showBreakDialog1} onOpenChange={setShowBreakDialog1}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Çalışma durdurulsun mu?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => {
                setShowBreakDialog1(false);
                startBreak();
              }}
              className="rounded-xl"
            >
              Durdur &amp; Molaya Geç
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => { setShowBreakDialog1(false); endSession(); }}
              className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Görevi Bitir
            </AlertDialogAction>
            <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
