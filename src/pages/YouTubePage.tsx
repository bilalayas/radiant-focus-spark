import { useState, useMemo } from 'react';
import { Youtube, Check, Search, Plus, ExternalLink, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  position: number;
}

export default function YouTubePage() {
  const { tasks, addTask, isTaskCompleted, setTaskCompleted, getTasksForDate } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Find all youtube tasks
  const youtubeTasks = useMemo(() => 
    tasks.filter(t => t.category?.startsWith('YT:')),
    [tasks]
  );

  // Group by playlist
  const playlists = useMemo(() => {
    const map: Record<string, typeof youtubeTasks> = {};
    youtubeTasks.forEach(t => {
      const pl = t.category || 'YT:Diğer';
      if (!map[pl]) map[pl] = [];
      map[pl].push(t);
    });
    return Object.entries(map);
  }, [youtubeTasks]);

  const handleFetchPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-playlist', {
        body: { playlistId: playlistUrl.trim() },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setVideos(data.videos || []);
      setPlaylistTitle(data.playlistTitle || 'Playlist');
    } catch (e: any) {
      toast.error('Playlist yüklenemedi: ' + (e.message || 'Hata'));
    }
    setLoading(false);
  };

  const handleImportAll = () => {
    const category = `YT:${playlistTitle}`;
    let added = 0;
    videos.forEach(v => {
      const exists = tasks.some(t => t.name === v.title && t.category === category);
      if (!exists) {
        addTask({ name: v.title, category, dates: [todayStr] });
        added++;
      }
    });
    toast.success(`${added} video görev olarak eklendi`);
    setDialogOpen(false);
    setVideos([]);
    setPlaylistUrl('');
  };

  const handleImportSingle = (video: PlaylistVideo) => {
    const category = `YT:${playlistTitle}`;
    const exists = tasks.some(t => t.name === video.title && t.category === category);
    if (exists) { toast.info('Bu video zaten ekli'); return; }
    addTask({ name: video.title, category, dates: [todayStr] });
    toast.success('Video eklendi');
  };

  const isCompleted = (taskId: string) => {
    // Check if completed on any date
    return tasks.some(t => t.id === taskId && t.dates.some(d => isTaskCompleted(taskId, d)));
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Youtube size={20} className="text-destructive" /> Video Görevleri
        </h1>
        <Button size="sm" className="rounded-xl" onClick={() => setDialogOpen(true)}>
          <Plus size={14} className="mr-1" /> Playlist Ekle
        </Button>
      </div>

      {/* Search */}
      {youtubeTasks.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Video ara..." className="pl-8 h-8 rounded-xl text-xs" />
        </div>
      )}

      {/* Playlist groups */}
      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <Youtube size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Henüz video görevi yok</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Playlist ekleyerek başlayın</p>
        </div>
      ) : (
        playlists.map(([category, vTasks]) => {
          const filteredTasks = searchQuery
            ? vTasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : vTasks;
          if (filteredTasks.length === 0) return null;

          const completedTasks = filteredTasks.filter(t => t.dates.some(d => isTaskCompleted(t.id, d)));
          const pendingTasks = filteredTasks.filter(t => !t.dates.some(d => isTaskCompleted(t.id, d)));
          const sortedTasks = [...pendingTasks, ...completedTasks];

          return (
            <Collapsible key={category} defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground">
                <span>{category.replace('YT:', '')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{completedTasks.length}/{filteredTasks.length}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pb-3">
                {sortedTasks.map((task, i) => {
                  const completed = task.dates.some(d => isTaskCompleted(task.id, d));
                  const isFirst = i === pendingTasks.length && completedTasks.length > 0;
                  return (
                    <div key={task.id}>
                      {isFirst && <div className="border-t border-dashed border-border my-2" />}
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                        completed ? 'bg-muted/50 opacity-60' : 'bg-card border border-border'
                      }`}>
                        <button
                          onClick={() => setTaskCompleted(task.id, todayStr, !completed)}
                          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            completed ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}
                        >
                          {completed && <Check size={12} className="text-primary-foreground" />}
                        </button>
                        <span className={`flex-1 truncate ${completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.name}
                        </span>
                        <a
                          href={`https://youtube.com/watch?v=${task.name}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-destructive p-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })
      )}

      {/* Import Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>YouTube Playlist Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="Playlist URL veya ID" className="rounded-xl text-sm" />
              <Button onClick={handleFetchPlaylist} disabled={loading} className="rounded-xl shrink-0">
                {loading ? '...' : 'Yükle'}
              </Button>
            </div>
            {videos.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{playlistTitle} — {videos.length} video</p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={handleImportAll}>
                    Tümünü Ekle
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[40vh] space-y-1">
                  {videos.map(v => (
                    <div key={v.videoId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                      <img src={v.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />
                      <span className="text-xs flex-1 truncate">{v.title}</span>
                      <button onClick={() => handleImportSingle(v)} className="text-primary p-1 shrink-0">
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
