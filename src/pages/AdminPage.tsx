import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Search, UserPlus, Trash2, Users } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  email?: string;
  roles: string[];
}

export default function AdminPage() {
  const { hasRole } = useApp();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .order('created_at', { ascending: false });

    // Fetch all roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach(r => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });

    const mapped: UserWithRoles[] = (profiles || []).map(p => ({
      user_id: p.user_id,
      display_name: p.display_name,
      roles: roleMap[p.user_id] || [],
    }));

    setUsers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddTeacherByCode = async () => {
    if (!emailInput.trim()) return;
    setAddingTeacher(true);

    // Look up profile by display_name (since we can't query auth.users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .ilike('display_name', `%${emailInput.trim()}%`);

    if (!profiles || profiles.length === 0) {
      toast.error('Kullanıcı bulunamadı');
      setAddingTeacher(false);
      return;
    }

    const targetUser = profiles[0];

    // Check if already has teacher role
    const existing = users.find(u => u.user_id === targetUser.user_id);
    if (existing?.roles.includes('teacher')) {
      toast.error('Bu kullanıcı zaten öğretmen');
      setAddingTeacher(false);
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: targetUser.user_id, role: 'teacher' as any });

    if (error) {
      toast.error('Rol eklenemedi: ' + error.message);
    } else {
      toast.success(`${targetUser.display_name} öğretmen olarak atandı`);
      setEmailInput('');
      await fetchUsers();
    }
    setAddingTeacher(false);
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role as any);

    if (error) {
      toast.error('Rol kaldırılamadı: ' + error.message);
    } else {
      toast.success('Rol kaldırıldı');
      await fetchUsers();
    }
  };

  const filteredUsers = searchQuery
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  if (!hasRole('admin')) {
    return (
      <div className="px-4 pt-6 pb-24 text-center">
        <Shield size={48} className="mx-auto text-destructive mb-4" />
        <h1 className="text-lg font-bold text-foreground mb-2">Erişim Reddedildi</h1>
        <p className="text-sm text-muted-foreground">Bu sayfaya yalnızca adminler erişebilir.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-lg font-bold mb-6 text-foreground flex items-center gap-2">
        <Shield size={20} /> Admin Paneli
      </h1>

      <div className="space-y-6">
        {/* Add Teacher */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <UserPlus size={14} /> Öğretmen Ata
          </h3>
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="Kullanıcı adı ara..."
              className="rounded-xl text-sm"
            />
            <Button
              onClick={handleAddTeacherByCode}
              disabled={addingTeacher || !emailInput.trim()}
              className="rounded-xl"
              size="sm"
            >
              {addingTeacher ? '...' : 'Ata'}
            </Button>
          </div>
        </div>

        {/* User List */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <Users size={14} /> Kullanıcılar ({users.length})
          </h3>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Kullanıcı ara..."
              className="rounded-xl text-sm pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredUsers.map(u => (
                <div key={u.user_id} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.display_name || 'İsimsiz'}
                    </p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {u.roles.length === 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Kullanıcı</Badge>
                      )}
                      {u.roles.map(role => (
                        <Badge
                          key={role}
                          variant={role === 'admin' ? 'default' : role === 'teacher' ? 'outline' : 'secondary'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Öğretmen' : role === 'student' ? 'Öğrenci' : role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!u.roles.includes('teacher') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] px-2"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('user_roles')
                            .insert({ user_id: u.user_id, role: 'teacher' as any });
                          if (error) toast.error(error.message);
                          else { toast.success('Öğretmen rolü eklendi'); fetchUsers(); }
                        }}
                      >
                        +Öğretmen
                      </Button>
                    )}
                    {u.roles.includes('teacher') && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-destructive">
                            <Trash2 size={10} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl max-w-sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Öğretmen rolü kaldırılsın mı?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {u.display_name} kullanıcısından öğretmen rolü kaldırılacak.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveRole(u.user_id, 'teacher')}
                              className="rounded-xl bg-destructive text-destructive-foreground"
                            >
                              Kaldır
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-lg font-bold text-foreground">{users.length}</p>
            <p className="text-[10px] text-muted-foreground">Toplam</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-lg font-bold text-primary">{users.filter(u => u.roles.includes('teacher')).length}</p>
            <p className="text-[10px] text-muted-foreground">Öğretmen</p>
          </div>
          <div className="bg-card rounded-2xl p-3 border border-border text-center">
            <p className="text-lg font-bold text-foreground">{users.filter(u => u.roles.includes('admin')).length}</p>
            <p className="text-[10px] text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
