import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPalette, paletteNames, PlanningMode } from '@/types';
import { Download, Trash2, Sun, Moon, LogOut, Save, User, Copy, Check, UserPlus, GraduationCap, ArrowLeftRight } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const {
    settings, updateSettings, clearAllData, exportData,
    profile, updateProfile, user,
    roles, hasRole, activeRole, setActiveRole,
    referralCode, pendingRequests, acceptedTeachers, acceptedStudents,
    sendCoachRequest, respondToCoachRequest, lookupReferralCode, refetchCoach,
  } = useApp();
  const { signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nameEditing, setNameEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [refCode, setRefCode] = useState('');
  const [lookupResult, setLookupResult] = useState<{ user_id: string; display_name: string; has_teacher_role: boolean } | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [sending, setSending] = useState(false);

  const isTeacher = hasRole('teacher');
  const isExamOrUni = settings.useCase === 'exam' || settings.useCase === 'university';
  const isTeacherMode = activeRole === 'teacher' && isTeacher;

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

  const handleSignOut = async () => {
    await signOut();
  };

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
    if (!result) {
      setLookupError('Kod bulunamadı');
      return;
    }
    if (result.user_id === user?.id) {
      setLookupError('Kendi kodunuzu kullanamazsınız');
      return;
    }
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

  const useCaseLabel = (uc: string) => {
    const map: Record<string, string> = { exam: 'Sınav Hazırlığı', university: 'Üniversite (YKS)', productivity: 'Genel Üretkenlik', free: 'Serbest Kullanım' };
    return map[uc] || uc;
  };

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
                  <Input
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="h-8 rounded-lg text-sm"
                    placeholder="Ad Soyad"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName} className="h-8 rounded-lg">
                    <Save size={12} />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setDisplayName(profile?.display_name || ''); setNameEditing(true); }}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
                >
                  {profile?.display_name || 'İsim belirle'}
                </button>
              )}
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {/* Role badges */}
              <div className="flex gap-1.5 mt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {isExamOrUni ? 'Öğrenci' : useCaseLabel(settings.useCase || 'free')}
                </span>
                {isTeacher && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Öğretmen
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Role switching for teachers */}
          {isTeacher && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowLeftRight size={14} /> Aktif Rol
              </span>
              <Select value={activeRole} onValueChange={setActiveRole}>
                <SelectTrigger className="w-[140px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{isExamOrUni ? 'Öğrenci' : useCaseLabel(settings.useCase || 'free')}</SelectItem>
                  <SelectItem value="teacher">Öğretmen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut size={14} className="mr-2" /> Çıkış Yap
          </Button>
        </div>

        {/* Coach Section - only for exam/university users in student mode */}
        {isExamOrUni && !isTeacherMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <GraduationCap size={14} /> Koçla Çalış
            </h3>

            {/* Referral code display + input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground">Referans Kodun</p>
                  <p className="text-sm font-mono font-bold text-foreground">{referralCode || '...'}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={handleCopyCode} className="h-8 w-8 p-0">
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => setCoachDialogOpen(true)}
              >
                <UserPlus size={14} className="mr-2" /> Referans Kodu Gir
              </Button>
            </div>

            {/* Connected teachers */}
            {acceptedTeachers.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Koçlarım</p>
                {acceptedTeachers.map(rel => (
                  <div key={rel.id} className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-xl">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(rel.teacher_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{rel.teacher_name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Bekleyen İstekler</p>
                {pendingRequests.map(req => {
                  const isFromTeacher = req.teacher_id !== user?.id;
                  const name = isFromTeacher ? req.teacher_name : req.student_name;
                  const roleLabel = isFromTeacher ? 'öğretmen' : 'öğrenci';
                  return (
                    <div key={req.id} className="bg-accent/30 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-foreground">
                        <strong>{name}</strong> adlı {roleLabel} sizinle çalışmak istiyor.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, true)}>
                          Kabul Et
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-lg h-8 text-xs" onClick={() => handleRespondRequest(req.id, false)}>
                          Reddet
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications - hide in teacher mode */}
        {!isTeacherMode && (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <h3 className="text-sm font-semibold mb-3 text-card-foreground">Bildirim Ayarları</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Bildirimler</span>
              <Switch checked={settings.notifications} onCheckedChange={v => updateSettings({ notifications: v })} />
            </div>
          </div>
        )}

        {/* Planning Hours - hide in teacher mode */}
        {!isTeacherMode && (
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
              <Select
                value={settings.planningMode ?? 'timestamp'}
                onValueChange={(v: PlanningMode) => updateSettings({ planningMode: v })}
              >
                <SelectTrigger className="w-[160px] h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Zaman Damgasına Göre</SelectItem>
                  <SelectItem value="list">Görevlere Göre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Use Case - hide in teacher mode */}
        {!isTeacherMode && (
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
              <button
                onClick={() => updateSettings({ themeMode: 'light' })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  settings.themeMode === 'light' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground'
                }`}
              >
                <Sun size={12} /> Light
              </button>
              <button
                onClick={() => updateSettings({ themeMode: 'dark' })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  settings.themeMode === 'dark' ? 'bg-card text-foreground shadow-sm font-medium' : 'text-muted-foreground'
                }`}
              >
                <Moon size={12} /> Dark
              </button>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-2">Renk Paleti</span>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(paletteNames) as [ColorPalette, string][]).map(([key, name]) => {
                const colors: Record<ColorPalette, string> = {
                  forest: 'bg-[hsl(152,44%,34%)]',
                  pink: 'bg-[hsl(340,55%,60%)]',
                  blue: 'bg-[hsl(210,55%,45%)]',
                  mono: 'bg-[hsl(0,0%,15%)]',
                };
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ colorPalette: key })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${
                      settings.colorPalette === key
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
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
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Tüm görevler, oturumlar ve tamamlama bilgileri silinecek.
                </AlertDialogDescription>
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
          <DialogHeader>
            <DialogTitle>Referans Kodu Gir</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={refCode}
                onChange={e => setRefCode(e.target.value.toUpperCase())}
                placeholder="CT-XXXXXX"
                className="rounded-xl font-mono"
              />
              <Button onClick={handleLookupCode} className="rounded-xl">Ara</Button>
            </div>
            {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
            {lookupResult && (
              <div className="bg-accent/50 rounded-xl p-3 space-y-2">
                <p className="text-sm text-foreground">
                  <strong>{lookupResult.display_name}</strong>
                  {lookupResult.has_teacher_role ? ' (Öğretmen)' : ' (Kullanıcı)'}
                </p>
                <Button
                  size="sm"
                  className="w-full rounded-lg"
                  onClick={handleSendRequest}
                  disabled={sending}
                >
                  {sending ? 'Gönderiliyor...' : 'Çalışma İsteği Gönder'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
