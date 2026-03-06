import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, ExternalLink, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
}

export default function ResourcesPage() {
  const { hasRole, user, addTask } = useApp();
  const isAdmin = hasRole('admin');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    setResources((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleCreate = async () => {
    if (!title.trim() || !user) return;
    const { error } = await supabase.from('resources').insert({
      title: title.trim(),
      description: description.trim() || null,
      url: url.trim() || null,
      category: category.trim() || null,
      created_by: user.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Kaynak oluşturuldu');
    setDialogOpen(false);
    setTitle(''); setDescription(''); setUrl(''); setCategory('');
    fetchResources();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id);
    toast.success('Kaynak silindi');
    fetchResources();
  };

  const handleAddToPlanning = (resource: Resource) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    addTask({
      name: resource.title,
      category: resource.category || 'Kaynak',
      description: resource.url || resource.description || undefined,
      dates: [todayStr],
    } as any);
    toast.success('Görev olarak eklendi');
  };

  const filtered = searchQuery
    ? resources.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || (r.category || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : resources;

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BookOpen size={20} /> Kaynaklar
        </h1>
        {isAdmin && (
          <Button size="sm" className="rounded-xl" onClick={() => setDialogOpen(true)}>
            <Plus size={14} className="mr-1" /> Yeni
          </Button>
        )}
      </div>

      {resources.length > 3 && (
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Kaynak ara..." className="pl-8 h-8 rounded-xl text-xs" />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Henüz kaynak yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(resource => (
            <div key={resource.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground">{resource.title}</h3>
                  {resource.category && (
                    <span className="text-[10px] text-muted-foreground">{resource.category}</span>
                  )}
                  {resource.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{resource.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  {resource.url && (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-accent transition-colors">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {!isAdmin && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={() => handleAddToPlanning(resource)}>
                      + Ekle
                    </Button>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDelete(resource.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Yeni Kaynak</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Başlık *" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" autoFocus />
            <Input placeholder="Kategori (opsiyonel)" value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl" />
            <Input placeholder="URL (opsiyonel)" value={url} onChange={e => setUrl(e.target.value)} className="rounded-xl" />
            <Textarea placeholder="Açıklama (opsiyonel)" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl" rows={3} />
            <Button onClick={handleCreate} disabled={!title.trim()} className="w-full rounded-xl">Oluştur</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
