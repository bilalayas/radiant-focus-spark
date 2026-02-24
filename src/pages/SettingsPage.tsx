import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPalette, paletteNames, PlanningMode } from '@/types';
import { Download, Trash2, Sun, Moon, LogOut, Save, User, Copy, Check, UserPlus, GraduationCap, ArrowLeftRight, Lock, Eye, EyeOff, ChevronDown, ChevronUp, MessageSquare, Send, Search } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const {
    settings, updateSettings, clearAllData, exportData,
    profile, updateProfile, user,
    roles, hasRole, activeRole, setActiveRole,
    referralCode, pendingRequests, acceptedTeachers, acceptedStudents,
    sendCoachRequest, respondToCoachRequest, lookupReferralCode, refetchCoach,
  } = useApp();
  const { signOut, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nameEditing, setNameEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [lookupResult, setLookupResult] = useState<{ user_id: string; display_name: string; has_teacher_role: boolean } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [sending, setSending] = useState(false);

  // Password change
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Collapsible states
  const [referralOpen, setReferralOpen] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTeacher, setChatTeacher] = useState<{ id: string; teacher_id: string; teacher_name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ from: string; text: string; timestamp: string }>>([]);
  const [chatText, setChatText] = useState('');
  const [chatPlanId, setChatPlanId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isTeacher = hasRole('teacher');
  const isAdmin = hasRole('admin');
  const hasMultipleRoles = roles.length > 1 || isTeacher || isAdmin;
  const isExamOrUni = settings.useCase === 'exam' || settings.useCase === 'university';
  const isTeacherMode = activeRole === 'teacher' && isTeacher;
  const isAdminMode = activeRole === 'admin' && isAdmin;
  const isStudentMode = !isTeacherMode && !isAdminMode;

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checktime-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveName = async () => {
    await updateProfile({ display_name: displayName.trim() });
    setNameEditing(false);
    toast.success('Profil güncellendi');
  };

  const handleSignOut = async () => { await signOut(); };

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Referans kodu kopyalandı');
    }
  };

  const handleLookupCode = async () => {
    if (!refCode.trim()) return;
    setLookupError('');
    setLookupResult(null);
    const result = await lookupReferralCode(refCode.trim().toUpperCase());
    if (!result) { setLookupError('Kod bulunamadı'); return; }
    if (result.user_id === user?.id) { setLookupError('Kendi kodunuzu kullanamazsınız'); return; }
    setLookupResult(result);
  };

  const handleSendRequest = async () => {
    if (!lookupResult) return;
    setSending(true);
    const { error } = await sendCoachRequest(lookupResult.user_id, lookupResult.has_teacher_role);
    setSending(false);
    if (error) {
      toast.error('İstek gönderilemedi: ' + error);
    } else {
      toast.success('İstek gönderildi!');
      setCoachDialogOpen(false);
      setRefCode('');
      setLookupResult(null);
      refetchCoach();
    }
  };

  const handleRespondRequest = async (id: string, accept: boolean) => {
    await respondToCoachRequest(id, accept);
    toast.success(accept ? 'İstek kabul edildi' : 'İstek reddedildi');
    refetchCoach();
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); return; }
    if (newPassword !== confirmPassword) { toast.error('Şifreler eşleşmiyor'); return; }
    setChangingPassword(true);
    const { error } = await updatePassword(newPassword);
    setChangingPassword(false);
    if (error) { toast.error(error.message); }
    else { toast.success('Şifre güncellendi!'); setPasswordDialogOpen(false); setNewPassword(''); setConfirmPassword(''); }
  };

  // Open chat with a teacher
  const openTeacherChat = async (rel: { id: string; teacher_id: string; teacher_name?: string }) => {
    setChatTeacher({ id: rel.id, teacher_id: rel.teacher_id, teacher_name: rel.teacher_name || 'İsimsiz' });
    // Find the latest plan between this teacher and student to use as chat channel
    const { data } = await supabase
      .from('pending_plans')
      .select('*')
      .eq('teacher_id', rel.teacher_id)
      .eq('student_id', user?.id || '')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const plan = data[0];
      setChatPlanId(plan.id);
      setChatMessages(Array.isArray((plan as any).messages) ? (plan as any).messages : []);
    } else {
      // Create a new plan entry as chat channel
      const { data: newPlan } = await supabase
        .from('pending_plans')
        .insert({
          teacher_id: rel.teacher_id,
          student_id: user?.id || '',
          plan_data: [],
          status: 'chat',
          messages: [],
        })
        .select()
        .single();
      if (newPlan) {
        setChatPlanId(newPlan.id);
        setChatMessages([]);
      }
    }
    setChatOpen(true);
  };

  const handleSendChatMessage = async () => {
    if (!chatText.trim() || !chatPlanId || !user) return;
    const newMsg = { from: user.id, text: chatText.trim(), timestamp: new Date().toISOString() };
    const updated = [...chatMessages, newMsg];
    const { error } = await supabase
      .from('pending_plans')
      .update({ messages: updated as any })
      .eq('id', chatPlanId);
    if (!error) {
      setChatMessages(updated);
      setChatText('');
    }
  };

  const useCaseLabel = (uc: string) => {
    const map: Record<string, string> = { exam: 'Sınav Hazırlığı', university: 'Üniversite (YKS)', productivity: 'Genel Üretkenlik', free: 'Serbest Kullanım' };
    return map[uc] || uc;
  };

  const getRoleOptions = () => {
    const options: { value: string; label: string }[] = [
      { value: 'student', label: isExamOrUni ? 'Öğrenci' : useCaseLabel(settings.useCase || 'free') },
    ];
    if (isTeacher) options.push({ value: 'teacher', label: 'Öğretmen' });
    if (isAdmin) options.push({ value: 'admin', label: 'Admin' });
    return options;
  };

  const filteredStudents = studentSearch
    ? acceptedStudents.filter(s => (s.student_name || '').toLowerCase().includes(studentSearch.toLowerCase()))
    : acceptedStudents;

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-lg font-bold mb-6 text-foreground">Ayarlar</h1>

      <div className="space-y-6">
        {/* Profile */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <User size={14} /> Profil
          </h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {nameEditing ? (
                <div className="flex gap-2">
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="h-8 rounded-lg text-sm" placeholder="Ad Soyad" autoFocus />
                  <Button size="sm" onClick={handleSaveName} className="h-8 rounded-lg"><Save size={12} /></Button>
                </div>
              ) : (
                <button onClick={() => { setDisplayName(profile?.display_name || ''); setNameEditing(true); }} className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left">
                  {profile?.display_name || 'İsim belirle'}
                </button>
              )}
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="flex gap-1.5 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {isExamOrUni ? 'Öğrenci' : useCaseLabel(settings.useCase || 'free')}
                </span>
                {isTeacher && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Öğretmen</span>}
                {isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Admin</span>}
              </div>
            </div>
          </div>

          {hasMultipleRoles && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground flex items-center gap-2"><ArrowLeftRight size={14} /> Aktif Rol</span>
              <Select value={activeRole} onValueChange={setActiveRole}>
                <SelectTrigger className="w-[140px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getRoleOptions().map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)} className="flex-1 rounded-xl">
              <Lock size={14} className="mr-2" /> Şifre Değiştir
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5">
              <LogOut size={14} className="mr-2" /> Çıkış
            </Button>
          </div>
        </div>

        {/* ─── STUDENT MODE: Koçum ─── */}
        {isStudentMode && isExamOrUni && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <GraduationCap size={14} /> {acceptedTeachers.length > 0 ? 'Koçum' : 'Koçla Çalış'}
            </h3>

            {/* Connected teachers - prominent */}
            {acceptedTeachers.length > 0 && (
              <div className="space-y-1.5">
                {acceptedTeachers.map(rel => (
                  <button
                    key={rel.id}
                    onClick={() => openTeacherChat(rel)}
                    className="w-full flex items-center gap-3 px-3 py-3 bg-accent/50 rounded-xl hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(rel.teacher_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{rel.teacher_name || 'İsimsiz'}</span>
                      <p className="text-[10px] text-muted-foreground">Mesaj göndermek için tıkla</p>
                    </div>
                    <MessageSquare size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Pending requests for student */}
            {pendingRequests.filter(r => r.teacher_id !== user?.id).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Bekleyen İstekler</p>
                {pendingRequests.filter(r => r.teacher_id !== user?.id).map(req => (
                  <div key={req.id} className="bg-accent/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-foreground">
                      <strong>{req.teacher_name || 'İsimsiz'}</strong> adlı öğretmen sizinle çalışmak istiyor.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, true)}>Kabul Et</Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, false)}>Reddet</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Collapsible Referral Section */}
            <Collapsible open={referralOpen} onOpenChange={setReferralOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                {referralOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>Referans İşlemleri</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Referans Kodun</p>
                    <p className="text-xs font-mono font-bold text-foreground">{referralCode || '...'}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleCopyCode} className="h-7 w-7 p-0">
                    {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="w-full rounded-xl text-xs" onClick={() => setCoachDialogOpen(true)}>
                  <UserPlus size={12} className="mr-2" /> Referans Kodu Gir
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* ─── TEACHER MODE: Öğrencilerim ─── */}
        {isTeacherMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <GraduationCap size={14} /> Öğrencilerim
            </h3>

            {/* Referral code - always visible for teacher */}
            <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
              <div>
                <p className="text-[10px] text-muted-foreground">Referans Kodun</p>
                <p className="text-xs font-mono font-bold text-foreground">{referralCode || '...'}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleCopyCode} className="h-7 w-7 p-0">
                {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
              </Button>
            </div>

            {/* Collapsible student list with search */}
            <Collapsible open={studentsOpen} onOpenChange={setStudentsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                <span className="flex items-center gap-1">
                  {studentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Öğrenci Listesi ({acceptedStudents.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {acceptedStudents.length > 2 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Ara..." className="pl-8 h-8 rounded-xl text-xs" />
                  </div>
                )}
                {filteredStudents.map(rel => (
                  <button
                    key={rel.id}
                    onClick={() => navigate(`/student/${rel.student_id}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-xl hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(rel.student_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{rel.student_name || 'İsimsiz'}</span>
                  </button>
                ))}
                {filteredStudents.length === 0 && acceptedStudents.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Sonuç yok</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Pending requests for teacher */}
            {pendingRequests.filter(r => r.student_id !== user?.id).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Bekleyen İstekler</p>
                {pendingRequests.filter(r => r.student_id !== user?.id).map(req => (
                  <div key={req.id} className="bg-accent/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-foreground">
                      <strong>{req.student_name || 'İsimsiz'}</strong> adlı öğrenci sizinle çalışmak istiyor.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, true)}>Kabul Et</Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, false)}>Reddet</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications - student mode only */}
        {isStudentMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-card-foreground">Bildirim Ayarları</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bildirimler</span>
              <Switch checked={settings.notifications} onCheckedChange={v => updateSettings({ notifications: v })} />
            </div>
          </div>
        )}

        {/* Planning Hours - student mode only */}
        {isStudentMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">Planlama</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saat aralığı</span>
              <div className="flex items-center gap-2">
                <Select value={String(settings.planningHourStart ?? 8)} onValueChange={v => updateSettings({ planningHourStart: parseInt(v) })}>
                  <SelectTrigger className="w-[76px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 25 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">–</span>
                <Select value={String(settings.planningHourEnd ?? 20)} onValueChange={v => updateSettings({ planningHourEnd: parseInt(v) })}>
                  <SelectTrigger className="w-[76px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 25 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Planlama Türü</span>
              <Select value={settings.planningMode ?? 'timestamp'} onValueChange={(v: PlanningMode) => updateSettings({ planningMode: v })}>
                <SelectTrigger className="w-[160px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Zaman Damgasına Göre</SelectItem>
                  <SelectItem value="list">Görevlere Göre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Use Case - student mode only */}
        {isStudentMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground">Kullanım Amacı</h3>
            <Select value={settings.useCase || 'free'} onValueChange={v => updateSettings({ useCase: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Sınav Hazırlığı</SelectItem>
                <SelectItem value="university">Üniversite (YKS)</SelectItem>
                <SelectItem value="productivity">Genel Üretkenlik</SelectItem>
                <SelectItem value="free">Serbest Kullanım</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Theme */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground">Tema</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mod</span>
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              <button onClick={() => updateSettings({ themeMode: 'light' })} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${settings.themeMode === 'light' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground'}`}>
                <Sun size={12} /> Light
              </button>
              <button onClick={() => updateSettings({ themeMode: 'dark' })} className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${settings.themeMode === 'dark' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground'}`}>
                <Moon size={12} /> Dark
              </button>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-2">Renk Paleti</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(paletteNames) as [ColorPalette, string][]).map(([key, name]) => {
                const colors: Record<ColorPalette, string> = {
                  forest: 'bg-[hsl(152,44%,34%)]', pink: 'bg-[hsl(340,55%,60%)]',
                  blue: 'bg-[hsl(210,55%,45%)]', mono: 'bg-[hsl(0,0%,15%)]',
                };
                return (
                  <button key={key} onClick={() => updateSettings({ colorPalette: key })} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${settings.colorPalette === key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30'}`}>
                    <div className={`w-4 h-4 rounded-full ${colors[key]}`} />
                    <span className="text-xs font-medium">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Data actions */}
        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1 rounded-2xl h-11 text-destructive border-destructive/30 hover:bg-destructive/5">
                <Trash2 size={14} className="mr-2" /> Veri Sıfırla
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Tüm veriler silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllData} className="rounded-xl bg-destructive text-destructive-foreground">Sıfırla</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" className="flex-1 rounded-2xl h-11" onClick={handleExport}>
            <Download size={14} className="mr-2" /> Veri Export
          </Button>
        </div>
      </div>

      {/* Coach Dialog */}
      <Dialog open={coachDialogOpen} onOpenChange={setCoachDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Referans Kodu Gir</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={refCode} onChange={e => setRefCode(e.target.value.toUpperCase())} placeholder="CT-XXXXXX" className="rounded-xl font-mono" />
              <Button onClick={handleLookupCode} className="rounded-xl">Ara</Button>
            </div>
            {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
            {lookupResult && (
              <div className="bg-accent/50 rounded-xl p-3 space-y-2">
                <p className="text-sm text-foreground">
                  <strong>{lookupResult.display_name}</strong>
                  {lookupResult.has_teacher_role ? ' (Öğretmen)' : ' (Kullanıcı)'}
                </p>
                <Button size="sm" className="w-full rounded-lg" onClick={handleSendRequest} disabled={sending}>
                  {sending ? 'Gönderiliyor...' : 'Çalışma İsteği Gönder'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={16} /> {chatTeacher?.teacher_name || 'Koç'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[50vh]">
            {chatMessages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Henüz mesaj yok</p>
            )}
            {chatMessages.map((msg, i) => {
              const isMine = msg.from === user?.id;
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${isMine ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input value={chatText} onChange={e => setChatText(e.target.value)} placeholder="Mesaj yaz..." className="rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()} />
            <Button size="sm" onClick={handleSendChatMessage} disabled={!chatText.trim()} className="rounded-xl">
              <Send size={14} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Şifre Değiştir</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Yeni şifre (min 6 karakter)" className="rounded-xl pr-10" />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Şifre tekrar" className="rounded-xl pr-10" />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 6} className="w-full rounded-xl">
              {changingPassword ? '...' : 'Şifreyi Güncelle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
