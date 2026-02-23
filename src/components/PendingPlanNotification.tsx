import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Eye, Check, X, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Task } from '@/types';

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
  teacher_name?: string;
}

export function PendingPlanNotification() {
  const { user, addTask } = useApp();
  const [plans, setPlans] = useState<PendingPlan[]>([]);
  const [previewPlan, setPreviewPlan] = useState<PendingPlan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgPlan, setMsgPlan] = useState<PendingPlan | null>(null);
  const [msgText, setMsgText] = useState('');

  const fetchPendingPlans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pending_plans')
      .select('*')
      .eq('student_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      // Fetch teacher names
      const teacherIds = [...new Set(data.map(p => p.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', teacherIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach(p => { nameMap[p.user_id] = p.display_name || 'İsimsiz'; });

      setPlans(data.map(p => ({
        ...p,
        plan_data: (Array.isArray(p.plan_data) ? p.plan_data : []) as unknown as PlanTask[],
        messages: (Array.isArray((p as any).messages) ? (p as any).messages : []) as any[],
        rejection_reason: (p as any).rejection_reason,
        teacher_name: nameMap[p.teacher_id],
      })));
    } else {
      setPlans([]);
    }
  }, [user]);

  useEffect(() => { fetchPendingPlans(); }, [fetchPendingPlans]);

  const handleApprove = async (plan: PendingPlan) => {
    // Add tasks from plan as teacher-sourced
    for (const planTask of plan.plan_data) {
      addTask({
        name: planTask.name,
        category: planTask.category,
        plannedDuration: planTask.plannedDuration,
        startHour: planTask.startHour,
        dates: planTask.dates,
        source: 'teacher',
      });
    }

    await supabase
      .from('pending_plans')
      .update({ status: 'accepted' })
      .eq('id', plan.id);

    toast.success('Plan onaylandı! Görevler eklendi.');
    setPreviewPlan(null);
    fetchPendingPlans();
  };

  const handleReject = async (plan: PendingPlan) => {
    if (!rejectReason.trim()) {
      toast.error('Lütfen red sebebi yazın');
      return;
    }

    const newMsg = { from: user!.id, text: `❌ Red: ${rejectReason.trim()}`, timestamp: new Date().toISOString() };
    const updatedMessages = [...(plan.messages || []), newMsg];

    await supabase
      .from('pending_plans')
      .update({ 
        status: 'rejected', 
        rejection_reason: rejectReason.trim(),
        messages: updatedMessages as any,
      })
      .eq('id', plan.id);

    toast.success('Plan reddedildi');
    setPreviewPlan(null);
    setShowReject(false);
    setRejectReason('');
    fetchPendingPlans();
  };

  const handleOpenMessages = (plan: PendingPlan) => {
    setMsgPlan(plan);
    setMsgDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!msgPlan || !msgText.trim() || !user) return;
    const newMsg = { from: user.id, text: msgText.trim(), timestamp: new Date().toISOString() };
    const updatedMessages = [...(msgPlan.messages || []), newMsg];
    await supabase
      .from('pending_plans')
      .update({ messages: updatedMessages as any })
      .eq('id', msgPlan.id);
    setMsgPlan({ ...msgPlan, messages: updatedMessages });
    setMsgText('');
    fetchPendingPlans();
  };

  if (plans.length === 0) return null;

  const planDates = (plan: PendingPlan) => [...new Set(plan.plan_data.flatMap(t => t.dates))].sort();

  return (
    <>
      {/* Notification banners */}
      <div className="px-4 space-y-2 mb-4">
        {plans.map(plan => (
          <div key={plan.id} className="bg-primary/10 border border-primary/20 rounded-2xl p-3 space-y-2">
            <p className="text-xs text-foreground">
              <strong>{plan.teacher_name || 'Koçunuz'}</strong> size bir program tanımlıyor
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-8 text-xs rounded-lg" onClick={() => { setPreviewPlan(plan); setShowReject(false); }}>
                <Eye size={12} className="mr-1" /> Önizle
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => handleOpenMessages(plan)}>
                <MessageSquare size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewPlan} onOpenChange={(open) => { if (!open) { setPreviewPlan(null); setShowReject(false); } }}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan Önizleme — {previewPlan?.teacher_name || 'Koç'}</DialogTitle>
          </DialogHeader>
          
          {previewPlan && (
            <div className="space-y-3">
              {/* Dates */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Düzenlenen günler:</p>
                <div className="flex flex-wrap gap-1">
                  {planDates(previewPlan).map(d => (
                    <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                  ))}
                </div>
              </div>

              {/* Tasks grouped by date */}
              {planDates(previewPlan).map(date => {
                const tasksForDate = previewPlan.plan_data.filter(t => t.dates.includes(date));
                return (
                  <div key={date} className="bg-accent/30 rounded-xl p-3">
                    <p className="text-xs font-semibold text-foreground mb-1.5">{date}</p>
                    <div className="space-y-1">
                      {tasksForDate.map((task, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-card-foreground truncate">{task.name}</p>
                            <div className="flex gap-2">
                              {task.category && <span className="text-[9px] text-muted-foreground">{task.category}</span>}
                              {task.plannedDuration && <span className="text-[9px] text-muted-foreground">{task.plannedDuration}dk</span>}
                              {task.startHour !== undefined && <span className="text-[9px] text-muted-foreground">{String(task.startHour).padStart(2, '0')}:00</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <p className="text-[10px] text-muted-foreground">
                ℹ️ Onaylarsanız bu görevler planınıza eklenecek. Mevcut görevleriniz korunacak.
                Koç görevleri ayrı renkte görünecek.
              </p>

              {/* Actions */}
              {!showReject ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-xl" onClick={() => handleApprove(previewPlan)}>
                    <Check size={14} className="mr-1" /> Onayla
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-xl text-destructive border-destructive/30" onClick={() => setShowReject(true)}>
                    <X size={14} className="mr-1" /> Reddet
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Neden reddediyorsunuz?"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="rounded-xl text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReject(false)}>
                      Geri
                    </Button>
                    <Button size="sm" className="flex-1 rounded-xl bg-destructive text-destructive-foreground" onClick={() => handleReject(previewPlan)}>
                      Reddet ve Gönder
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Messages Dialog */}
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>Koç ile Mesajlar</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
            {(!msgPlan?.messages || msgPlan.messages.length === 0) && (
              <p className="text-xs text-muted-foreground text-center py-6">Henüz mesaj yok</p>
            )}
            {(msgPlan?.messages || []).map((msg, i) => {
              const isMine = msg.from === user?.id;
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                    isMine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              placeholder="Mesaj yaz..."
              className="rounded-xl text-sm"
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <Button size="sm" onClick={handleSendMessage} disabled={!msgText.trim()} className="rounded-xl">
              <Send size={14} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
