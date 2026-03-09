import { useState, useMemo, useCallback, useEffect } from 'react';
import { Youtube, ClipboardList, BookOpen, Plus, Trash2, Search, ChevronDown, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTests, Test } from '@/hooks/useTests';
import { getSubjectsForStudent, searchTopics } from '@/data/curriculum';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  position: number;
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
}

export default function HelperResourcesPage() {
  const { tasks, addTask, user, profile, hasRole, isTaskCompleted } = useApp();
  const { tests, addTest, updateTest, deleteTest } = useTests();
  const isAdmin = hasRole('admin');

  // Global search
  const [globalSearch, setGlobalSearch] = useState('');

  // YouTube state
  const [ytDialogOpen, setYtDialogOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState('');

  // Tests state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testName, setTestName] = useState('');
  const [testSubject, setTestSubject] = useState('');
  const [testTopic, setTestTopic] = useState('');
  const [testTotalQ, setTestTotalQ] = useState('');
  const [testBookName, setTestBookName] = useState('');
  const [testEstDuration, setTestEstDuration] = useState('');
  const [testCount, setTestCount] = useState('1');
  const [testAnalysisDur, setTestAnalysisDur] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [testFilter, setTestFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Result entry
  const [resultDialog, setResultDialog] = useState<Test | null>(null);
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');
  const [solveDur, setSolveDur] = useState('');
  const [analysisDur, setAnalysisDur] = useState('');

  // Admin resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceLoading, setResourceLoading] = useState(true);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resDescription, setResDescription] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resCategory, setResCategory] = useState('');

  const studentField = profile?.student_field || null;
  const subjects = useMemo(() => getSubjectsForStudent(studentField), [studentField]);
  const topicResults = useMemo(() => searchTopics(topicSearch, studentField), [topicSearch, studentField]);

  // YouTube tasks (stored without dates) - sorted by position (ascending)
  const youtubeTasks = useMemo(() => {
    const yt = tasks.filter(t => t.category?.startsWith('YT:'));
    return yt; // keep original insertion order
  }, [tasks]);

  const playlists = useMemo(() => {
    const map: Record<string, typeof youtubeTasks> = {};
    youtubeTasks.forEach(t => {
      const pl = t.category || 'YT:Diğer';
      if (!map[pl]) map[pl] = [];
      map[pl].push(t);
    });
    // Sort each playlist by name (which contains position naturally from import)
    return Object.entries(map);
  }, [youtubeTasks]);

  // Filter playlists by search
  const filteredPlaylists = useMemo(() => {
    if (!globalSearch) return playlists;
    const q = globalSearch.toLowerCase();
    return playlists.map(([cat, vTasks]) => {
      const filtered = vTasks.filter(t => t.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q));
      return [cat, filtered] as [string, typeof vTasks];
    }).filter(([, vTasks]) => vTasks.length > 0);
  }, [playlists, globalSearch]);

  // Tests filtered
  const filteredTests = useMemo(() => {
    let result = tests;
    if (testFilter !== 'all') result = result.filter(t => t.status === testFilter);
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || (t.book_name || '').toLowerCase().includes(q));
    }
    return result;
  }, [tests, testFilter, globalSearch]);

  // Filter resources by search
  const filteredResources = useMemo(() => {
    if (!globalSearch) return resources;
    const q = globalSearch.toLowerCase();
    return resources.filter(r => r.title.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q));
  }, [resources, globalSearch]);

  // Fetch resources
  const fetchResources = useCallback(async () => {
    setResourceLoading(true);
    const { data } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
    setResources((data as any[]) || []);
    setResourceLoading(false);
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // YouTube handlers
  const handleFetchPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setYtLoading(true);
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
    setYtLoading(false);
  };

  const handleImportAll = () => {
    const category = `YT:${playlistTitle}`;
    let added = 0;
    // Import in correct order (position ascending)
    const sorted = [...videos].sort((a, b) => a.position - b.position);
    sorted.forEach(v => {
      const exists = tasks.some(t => t.name === v.title && t.category === category);
      if (!exists) {
        addTask({
          name: v.title,
          category,
          description: `https://youtube.com/watch?v=${v.videoId}`,
          dates: [],
        });
        added++;
      }
    });
    toast.success(`${added} video sisteme eklendi`);
    setYtDialogOpen(false);
    setVideos([]);
    setPlaylistUrl('');
  };

  const handleImportSingle = (video: PlaylistVideo) => {
    const category = `YT:${playlistTitle}`;
    const exists = tasks.some(t => t.name === video.title && t.category === category);
    if (exists) { toast.info('Bu video zaten ekli'); return; }
    addTask({
      name: video.title,
      category,
      description: `https://youtube.com/watch?v=${video.videoId}`,
      dates: [],
    });
    toast.success('Video sisteme eklendi');
  };

  // Test handlers
  const handleCreateTest = async () => {
    if (!testName.trim() || !testSubject || !user) return;
    const count = Math.max(1, parseInt(testCount) || 1);
    const estDur = parseInt(testEstDuration) || 0;
    const analysisMins = parseInt(testAnalysisDur) || 0;

    for (let i = 0; i < count; i++) {
      const suffix = count > 1 ? ` (${i + 1})` : '';
      await addTest({
        user_id: user.id,
        created_by: user.id,
        name: testName.trim() + suffix,
        subject: testSubject,
        topic: testTopic || undefined,
        book_name: testBookName.trim() || undefined,
        total_questions: parseInt(testTotalQ) || 0,
        correct_count: 0, wrong_count: 0, blank_count: 0,
        solve_duration: 0, analysis_duration: 0,
        estimated_duration: estDur,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
      } as any);
    }
    toast.success(`${count} test oluşturuldu`);
    setTestDialogOpen(false);
    setTestName(''); setTestSubject(''); setTestTopic(''); setTestTotalQ('');
    setTestBookName(''); setTestEstDuration(''); setTestCount('1'); setTestAnalysisDur('');
    setTopicSearch('');
  };

  const handleSaveResult = async () => {
    if (!resultDialog) return;
    await updateTest(resultDialog.id, {
      correct_count: parseInt(correct) || 0,
      wrong_count: parseInt(wrong) || 0,
      blank_count: parseInt(blank) || 0,
      solve_duration: parseInt(solveDur) || 0,
      analysis_duration: parseInt(analysisDur) || 0,
      status: 'completed',
    });
    toast.success('Sonuçlar kaydedildi');
    setResultDialog(null);
  };

  // Admin resource handlers
  const handleCreateResource = async () => {
    if (!resTitle.trim() || !user) return;
    const { error } = await supabase.from('resources').insert({
      title: resTitle.trim(),
      description: resDescription.trim() || null,
      url: resUrl.trim() || null,
      category: resCategory.trim() || null,
      created_by: user.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success('Kaynak oluşturuldu');
    setResourceDialogOpen(false);
    setResTitle(''); setResDescription(''); setResUrl(''); setResCategory('');
    fetchResources();
  };

  const handleDeleteResource = async (id: string) => {
    await supabase.from('resources').delete().eq('id', id);
    toast.success('Kaynak silindi');
    fetchResources();
  };

  const net = (c: number, w: number) => (c - w * 0.25).toFixed(2);

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-lg font-bold text-foreground mb-3">Yardımcı Kaynaklar</h1>

      {/* Global Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
        <Input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Tüm kaynaklarda ara..." className="pl-8 h-9 rounded-xl text-sm" />
      </div>

      <Tabs defaultValue="youtube" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 rounded-xl">
          <TabsTrigger value="youtube" className="text-xs rounded-lg gap-1"><Youtube size={12} /> YouTube</TabsTrigger>
          <TabsTrigger value="tests" className="text-xs rounded-lg gap-1"><ClipboardList size={12} /> Testler</TabsTrigger>
          <TabsTrigger value="resources" className="text-xs rounded-lg gap-1"><BookOpen size={12} /> Kaynaklar</TabsTrigger>
        </TabsList>

        {/* ─── YouTube Tab ─── */}
        <TabsContent value="youtube" className="mt-3 space-y-3">
          <Button size="sm" className="rounded-xl w-full" onClick={() => setYtDialogOpen(true)}>
            <Plus size={14} className="mr-1" /> Playlist / Video Ekle
          </Button>

          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-8">
              <Youtube size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{globalSearch ? 'Sonuç bulunamadı' : 'Henüz tanımlanmış video yok'}</p>
            </div>
          ) : (
            filteredPlaylists.map(([category, vTasks]) => (
              <Collapsible key={category} defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground">
                  <span>{category.replace('YT:', '')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{vTasks.length} video</span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pb-3">
                  {vTasks.map(task => {
                    const hasDate = task.dates.length > 0;
                    return (
                      <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${hasDate ? 'bg-primary/5 border border-primary/20' : 'bg-card border border-border'}`}>
                        <span className="flex-1 truncate text-foreground">{task.name}</span>
                        {hasDate && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Atandı</span>}
                        {task.description && (
                          <a href={task.description} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-destructive p-1" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </TabsContent>

        {/* ─── Tests Tab ─── */}
        <TabsContent value="tests" className="mt-3 space-y-3">
          <Button size="sm" className="rounded-xl w-full" onClick={() => setTestDialogOpen(true)}>
            <Plus size={14} className="mr-1" /> Yeni Test Tanımla
          </Button>

          <div className="flex gap-2">
            <Select value={testFilter} onValueChange={v => setTestFilter(v as any)}>
              <SelectTrigger className="w-[100px] h-8 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="pending">Bekleyen</SelectItem>
                <SelectItem value="completed">Biten</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredTests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{globalSearch ? 'Sonuç bulunamadı' : 'Henüz test yok'}</p>
          ) : (
            <div className="space-y-2">
              {filteredTests.map(test => (
                <div key={test.id} className={`bg-card rounded-xl border shadow-sm p-3 ${test.status === 'completed' ? 'border-primary/20' : 'border-border'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{test.name}</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{test.subject}</span>
                        {test.book_name && <span className="text-[10px] text-muted-foreground">• 📖 {test.book_name}</span>}
                        {test.topic && <span className="text-[10px] text-muted-foreground">• {test.topic}</span>}
                        {test.estimated_duration > 0 && <span className="text-[10px] text-muted-foreground">• ~{test.estimated_duration}dk</span>}
                      </div>
                      {test.status === 'completed' && (
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                            Net: {net(test.correct_count, test.wrong_count)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">D:{test.correct_count} Y:{test.wrong_count} B:{test.blank_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {test.status === 'pending' && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => {
                          setResultDialog(test);
                          setCorrect(String(test.correct_count));
                          setWrong(String(test.wrong_count));
                          setBlank(String(test.blank_count));
                          setSolveDur(String(test.solve_duration));
                          setAnalysisDur(String(test.analysis_duration));
                        }}>Sonuç</Button>
                      )}
                      <button onClick={() => deleteTest(test.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Admin Resources Tab ─── */}
        <TabsContent value="resources" className="mt-3 space-y-3">
          {isAdmin && (
            <Button size="sm" className="rounded-xl w-full" onClick={() => setResourceDialogOpen(true)}>
              <Plus size={14} className="mr-1" /> Yeni Kaynak
            </Button>
          )}

          {resourceLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{globalSearch ? 'Sonuç bulunamadı' : 'Henüz kaynak yok'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResources.map(res => (
                <div key={res.id} className="bg-card rounded-xl border border-border shadow-sm p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground">{res.title}</h3>
                      {res.category && <span className="text-[10px] text-muted-foreground">{res.category}</span>}
                      {res.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{res.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0 ml-2">
                      {res.url && (
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-primary"><ExternalLink size={14} /></a>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDeleteResource(res.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* YouTube Dialog */}
      <Dialog open={ytDialogOpen} onOpenChange={setYtDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>YouTube Playlist Ekle</DialogTitle></DialogHeader>
          <div className="space-y-3 overflow-y-auto">
            <div className="flex gap-2">
              <Input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="Playlist URL veya ID" className="rounded-xl text-sm" />
              <Button onClick={handleFetchPlaylist} disabled={ytLoading} className="rounded-xl shrink-0">{ytLoading ? '...' : 'Yükle'}</Button>
            </div>
            {videos.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{playlistTitle} — {videos.length} video</p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={handleImportAll}>Tümünü Ekle</Button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[40vh] space-y-1">
                  {[...videos].sort((a, b) => a.position - b.position).map(v => (
                    <div key={v.videoId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                      <img src={v.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />
                      <span className="text-xs flex-1 truncate">{v.title}</span>
                      <button onClick={() => handleImportSingle(v)} className="text-primary p-1 shrink-0"><Plus size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Create Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Yeni Test Tanımla</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Test adı *" value={testName} onChange={e => setTestName(e.target.value)} className="rounded-xl" autoFocus />
            <Input placeholder="Kitap adı (opsiyonel)" value={testBookName} onChange={e => setTestBookName(e.target.value)} className="rounded-xl" />
            <Select value={testSubject} onValueChange={v => { setTestSubject(v); setTestTopic(''); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Ders seç *" /></SelectTrigger>
              <SelectContent className="max-h-48">{subjects.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            {testSubject && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input value={topicSearch} onChange={e => setTopicSearch(e.target.value)} placeholder="Konu ara..." className="pl-8 rounded-xl text-sm" />
                </div>
                {topicSearch && topicResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5 bg-muted rounded-xl p-1.5">
                    {topicResults.map(t => (
                      <button key={t.id} onClick={() => { setTestTopic(t.name); setTopicSearch(''); }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                        {t.name} <span className="text-muted-foreground">– {t.subject}</span>
                      </button>
                    ))}
                  </div>
                )}
                {testTopic && <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-lg inline-block">Konu: {testTopic}</div>}
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Soru sayısı" value={testTotalQ} onChange={e => setTestTotalQ(e.target.value)} className="rounded-xl" />
              <Input type="number" placeholder="Test adedi" value={testCount} onChange={e => setTestCount(e.target.value)} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Tahmini süre (dk)" value={testEstDuration} onChange={e => setTestEstDuration(e.target.value)} className="rounded-xl" />
              <Input type="number" placeholder="Analiz süresi (dk)" value={testAnalysisDur} onChange={e => setTestAnalysisDur(e.target.value)} className="rounded-xl" />
            </div>
            <Button onClick={handleCreateTest} disabled={!testName.trim() || !testSubject} className="w-full rounded-xl">Oluştur</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={!!resultDialog} onOpenChange={v => !v && setResultDialog(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Sonuç Gir — {resultDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-muted-foreground">Doğru</label><Input type="number" value={correct} onChange={e => setCorrect(e.target.value)} className="rounded-xl h-9" /></div>
              <div><label className="text-[10px] text-muted-foreground">Yanlış</label><Input type="number" value={wrong} onChange={e => setWrong(e.target.value)} className="rounded-xl h-9" /></div>
              <div><label className="text-[10px] text-muted-foreground">Boş</label><Input type="number" value={blank} onChange={e => setBlank(e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-muted-foreground">Çözüm Süresi (dk)</label><Input type="number" value={solveDur} onChange={e => setSolveDur(e.target.value)} className="rounded-xl h-9" /></div>
              <div><label className="text-[10px] text-muted-foreground">Analiz Süresi (dk)</label><Input type="number" value={analysisDur} onChange={e => setAnalysisDur(e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            {correct && wrong && (
              <div className="text-center"><span className="text-sm font-bold text-primary">Net: {net(parseInt(correct) || 0, parseInt(wrong) || 0)}</span></div>
            )}
            <Button onClick={handleSaveResult} className="w-full rounded-xl">Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Resource Create Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Yeni Kaynak</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Başlık *" value={resTitle} onChange={e => setResTitle(e.target.value)} className="rounded-xl" autoFocus />
            <Input placeholder="Kategori (opsiyonel)" value={resCategory} onChange={e => setResCategory(e.target.value)} className="rounded-xl" />
            <Input placeholder="URL (opsiyonel)" value={resUrl} onChange={e => setResUrl(e.target.value)} className="rounded-xl" />
            <Textarea placeholder="Açıklama (opsiyonel)" value={resDescription} onChange={e => setResDescription(e.target.value)} className="rounded-xl" rows={3} />
            <Button onClick={handleCreateResource} disabled={!resTitle.trim()} className="w-full rounded-xl">Oluştur</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
