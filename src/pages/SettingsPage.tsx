import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPalette, paletteNames, PlanningMode } from '@/types';
import { Download, Trash2, Sun, Moon, LogOut, Save, User } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings, clearAllData, exportData } = useApp();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile(user);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nameEditing, setNameEditing] = useState(false);

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
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <LogOut size={14} className="mr-2" /> Çıkış Yap
          </Button>
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <h3 className="text-sm font-semibold mb-3 text-card-foreground">Bildirim Ayarları</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bildirimler</span>
            <Switch checked={settings.notifications} onCheckedChange={v => updateSettings({ notifications: v })} />
          </div>
        </div>

        {/* Planning Hours */}
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

        {/* Use Case */}
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
    </div>
  );
}
