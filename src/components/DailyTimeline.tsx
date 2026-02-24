import { useMemo } from 'react';
import type { Session } from '@/types';

const COLORS = [
  'hsl(152,44%,34%)', 'hsl(210,55%,45%)', 'hsl(340,55%,60%)',
  'hsl(45,70%,50%)', 'hsl(280,45%,55%)', 'hsl(20,70%,50%)',
];

interface DailyTimelineProps {
  sessions: Session[];
  tasks: Array<{ id: string; name: string; category?: string }>;
  allTasksCompleted?: boolean;
}

export function DailyTimeline({ sessions, tasks, allTasksCompleted }: DailyTimelineProps) {
  const segments = useMemo(() => {
    if (sessions.length === 0) return [];

    // Sort sessions by timestamp
    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    const totalDuration = sorted.reduce((sum, s) => sum + s.duration, 0);
    if (totalDuration === 0) return [];

    // Build segments with gaps as breaks
    const result: Array<{
      type: 'work' | 'break' | 'gap';
      duration: number;
      percentage: number;
      color: string;
      label: string;
      taskName?: string;
    }> = [];

    // Category color map
    const categoryMap = new Map<string, string>();
    let colorIdx = 0;
    tasks.forEach(t => {
      const cat = t.category || t.name;
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, COLORS[colorIdx % COLORS.length]);
        colorIdx++;
      }
    });

    // Calculate full span from first to last session end
    const firstStart = sorted[0].timestamp;
    const lastEnd = sorted[sorted.length - 1].timestamp + sorted[sorted.length - 1].duration * 1000;
    const totalSpan = (lastEnd - firstStart) / 1000; // in seconds

    if (totalSpan <= 0) return [];

    let currentTime = firstStart;

    sorted.forEach(session => {
      const sessionStart = session.timestamp;
      
      // Gap before this session
      const gapDuration = (sessionStart - currentTime) / 1000;
      if (gapDuration > 30) { // Only show gaps > 30 seconds
        result.push({
          type: 'gap',
          duration: gapDuration,
          percentage: (gapDuration / totalSpan) * 100,
          color: 'hsl(var(--muted))',
          label: 'Ara',
        });
      }

      const task = tasks.find(t => t.id === session.taskId);
      const cat = task?.category || task?.name || (session.type === 'break' ? 'Mola' : 'Diğer');
      const color = session.type === 'break'
        ? 'hsl(var(--muted-foreground))'
        : (categoryMap.get(cat) || COLORS[0]);

      result.push({
        type: session.type as 'work' | 'break',
        duration: session.duration,
        percentage: (session.duration / totalSpan) * 100,
        color,
        label: session.type === 'break' ? 'Mola' : cat,
        taskName: task?.name,
      });

      currentTime = sessionStart + session.duration * 1000;
    });

    return result;
  }, [sessions, tasks]);

  // Time labels
  const timeLabels = useMemo(() => {
    if (sessions.length === 0) return { start: '00:00', end: '00:00' };
    const sorted = [...sessions].sort((a, b) => a.timestamp - b.timestamp);
    const startDate = new Date(sorted[0].timestamp);
    const lastSession = sorted[sorted.length - 1];
    const endDate = new Date(lastSession.timestamp + lastSession.duration * 1000);
    
    // If all tasks completed, show end time; otherwise show 00
    const endLabel = allTasksCompleted
      ? `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      : `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    return {
      start: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      end: endLabel,
    };
  }, [sessions, allTasksCompleted]);

  // Legend - unique categories
  const legend = useMemo(() => {
    const seen = new Map<string, string>();
    segments.forEach(s => {
      if (!seen.has(s.label)) seen.set(s.label, s.color);
    });
    return Array.from(seen.entries()).map(([label, color]) => ({ label, color }));
  }, [segments]);

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
        <p className="text-xs text-muted-foreground mb-2">Günlük Zaman Çizelgesi</p>
        <div className="h-6 bg-muted rounded-full" />
        <p className="text-[10px] text-muted-foreground text-center mt-1">Henüz veri yok</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <p className="text-xs text-muted-foreground mb-2">Günlük Zaman Çizelgesi</p>
      
      {/* Time labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
        <span>{timeLabels.start}</span>
        <span>{timeLabels.end}</span>
      </div>

      {/* Timeline bar */}
      <div className="flex h-6 rounded-full overflow-hidden bg-muted">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="relative flex items-center justify-center overflow-hidden transition-all"
            style={{
              width: `${Math.max(seg.percentage, 1)}%`,
              backgroundColor: seg.color,
            }}
            title={`${seg.label}: ${Math.round(seg.duration / 60)}dk`}
          >
            {seg.percentage > 8 && (
              <span className="text-[8px] font-bold text-white drop-shadow-sm">
                {Math.round(seg.percentage)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {legend.map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[10px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
