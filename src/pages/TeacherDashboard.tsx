import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

export default function TeacherDashboard() {
  const { acceptedStudents, profile } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = search
    ? acceptedStudents.filter(s => (s.student_name || '').toLowerCase().includes(search.toLowerCase()))
    : acceptedStudents;

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-lg font-bold mb-2 text-foreground">Öğretmen Paneli</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Hoş geldin, {profile?.display_name || 'Öğretmen'}
      </p>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users size={16} /> Öğrencilerim ({acceptedStudents.length})
        </h2>

        {/* Search */}
        {acceptedStudents.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Öğrenci ara..."
              className="pl-9 rounded-xl"
            />
          </div>
        )}

        {acceptedStudents.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm text-center">
            <p className="text-sm text-muted-foreground">Henüz kabul edilmiş öğrenciniz yok.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Öğrenciler referans kodunuzu kullanarak sizinle eşleşebilir.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sonuç bulunamadı</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(rel => (
              <button
                key={rel.id}
                onClick={() => navigate(`/student/${rel.student_id}`)}
                className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 border border-border shadow-sm hover:border-primary/40 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(rel.student_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{rel.student_name || 'İsimsiz'}</p>
                  <p className="text-xs text-muted-foreground">Öğrenci</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
