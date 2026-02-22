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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface UserWithRoles {
  user_id: string;
  display_name: string | null;
  roles: string[];
}

export default function AdminPage() {
  const { hasRole } = useApp();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('teacher');
  const [addingRole, setAddingRole] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .order('created_at', { ascending: false });

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

  const handleAddRoleByName = async () => {
    if (!emailInput.trim()) return;
    setAddingRole(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name')
      .ilike('display_name', `%${emailInput.trim()}%`);

    if (!profiles || profiles.length === 0) {
      toast.error('Kullanıcı bulunamadı');
      setAddingRole(false);
      return;
    }

    const targetUser = profiles[0];
    const existing = users.find(u => u.user_id === targetUser.user_id);
    if (existing?.roles.includes(selectedRole)) {
      toast.error(`Bu kullanıcı zaten ${selectedRole === 'teacher' ? 'öğretmen' : selectedRole === 'admin' ? 'admin' : selectedRole}`);
      setAddingRole(false);
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: targetUser.user_id, role: selectedRole as any });

    if (error) {
      toast.error('Rol eklenemedi: ' + error.message);
    } else {
      const roleLabel = selectedRole === 'teacher' ? 'Öğretmen' : selectedRole === 'admin' ? 'Admin' : selectedRole;
      toast.success(`${targetUser.display_name} → ${roleLabel} olarak atandı`);
      setEmailInput('');
      await fetchUsers();
    }
    setAddingRole(false);
  };

  const handleAddRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: role as any });
    if (error) toast.error(error.message);
    else { toast.success('Rol eklendi'); fetchUsers(); }
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
        {/* Add Role */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <UserPlus size={14} /> Rol Ata
          </h3>
          <div className="flex gap-2">
            <Input
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              placeholder="Kullanıcı adı ara..."
              className="rounded-xl text-sm flex-1"
            />
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[110px] rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Öğretmen</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="student">Öğrenci</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAddRoleByName}
            disabled={addingRole || !emailInput.trim()}
            className="w-full rounded-xl"
            size="sm"
          >
            {addingRole ? '...' : 'Rolü Ata'}
          </Button>
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
                <div key={u.user_id} className="bg-muted/50 rounded-xl px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.display_name || 'İsimsiz'}
                      </p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {u.roles.length === 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Kullanıcı</Badge>
                        )}
                        {u.roles.map(role => (
                          <div key={role} className="flex items-center gap-0.5">
                            <Badge
                              variant={role === 'admin' ? 'default' : role === 'teacher' ? 'outline' : 'secondary'}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Öğretmen' : role === 'student' ? 'Öğrenci' : role}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-destructive/60 hover:text-destructive transition-colors">
                                  <Trash2 size={10} />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl max-w-sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{role} rolü kaldırılsın mı?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {u.display_name} kullanıcısından {role} rolü kaldırılacak.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveRole(u.user_id, role)}
                                    className="rounded-xl bg-destructive text-destructive-foreground"
                                  >
                                    Kaldır
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!u.roles.includes('teacher') && (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2"
                          onClick={() => handleAddRole(u.user_id, 'teacher')}>+Öğrt</Button>
                      )}
                      {!u.roles.includes('admin') && (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2"
                          onClick={() => handleAddRole(u.user_id, 'admin')}>+Admin</Button>
                      )}
                    </div>
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
