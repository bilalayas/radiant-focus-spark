import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, ChevronDown, CheckCircle2, Clock, Search } from 'lucide-react';
import { useTests, Test } from '@/hooks/useTests';
import { useApp } from '@/context/AppContext';
import { getSubjectsForStudent, searchTopics } from '@/data/curriculum';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function TestsPage() {
  const { user, profile } = useApp();
  const { tests, addTest, updateTest, deleteTest } = useTests();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New test form
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [totalQ, setTotalQ] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  // Result entry
  const [resultDialog, setResultDialog] = useState<Test | null>(null);
  const [correct, setCorrect] = useState('');
  const [wrong, setWrong] = useState('');
  const [blank, setBlank] = useState('');
  const [solveDur, setSolveDur] = useState('');
  const [analysisDur, setAnalysisDur] = useState('');

  const studentField = profile?.student_field || null;
  const subjects = useMemo(() => getSubjectsForStudent(studentField), [studentField]);
  const topicResults = useMemo(() => searchTopics(topicSearch, studentField), [topicSearch, studentField]);

  const filteredTests = useMemo(() => {
    let result = tests;
    if (filter !== 'all') result = result.filter(t => t.status === filter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));
    }
    return result;
  }, [tests, filter, searchQuery]);

  const handleCreate = async () => {
    if (!name.trim() || !subject || !user) return;
    await addTest({
      user_id: user.id,
      created_by: user.id,
      name: name.trim(),
      subject,
      topic: topic || undefined,
      total_questions: parseInt(totalQ) || 0,
      correct_count: 0, wrong_count: 0, blank_count: 0,
      solve_duration: 0, analysis_duration: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
    } as any);
    toast.success('Test oluşturuldu');
    setDialogOpen(false);
    resetForm();
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

  const resetForm = () => {
    setName(''); setSubject(''); setTopic(''); setTotalQ(''); setTopicSearch('');
  };

  const net = (c: number, w: number) => (c - w * 0.25).toFixed(2);

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-foreground">Testlerim</h1>
        <Button size="sm" className="rounded-xl" onClick={() => setDialogOpen(true)}>
          <Plus size={14} className="mr-1" /> Yeni Test
        </Button>
      </div>

      {/* Filter & Search */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ara..." className="pl-8 h-8 rounded-xl text-xs" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-[110px] h-8 rounded-xl text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="pending">Bekleyen</SelectItem>
            <SelectItem value="completed">Tamamlanan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Test list */}
      <div className="space-y-2">
        {filteredTests.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Henüz test yok</p>
        )}
        {filteredTests.map(test => (
          <div key={test.id} className={`bg-card rounded-xl border shadow-sm p-3 ${test.status === 'completed' ? 'border-primary/20' : 'border-border'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {test.status === 'completed' ? (
                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                  ) : (
                    <Clock size={14} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{test.name}</span>
                </div>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">{test.subject}</span>
                  {test.topic && <span className="text-[10px] text-muted-foreground">• {test.topic}</span>}
                  <span className="text-[10px] text-muted-foreground">• {test.date}</span>
                </div>
                {test.status === 'completed' && (
                  <div className="flex gap-3 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      Net: {net(test.correct_count, test.wrong_count)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      D:{test.correct_count} Y:{test.wrong_count} B:{test.blank_count}
                    </span>
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
                  }}>
                    Sonuç Gir
                  </Button>
                )}
                <button onClick={() => deleteTest(test.id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Yeni Test</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Test adı *" value={name} onChange={e => setName(e.target.value)} className="rounded-xl" autoFocus />
            <Select value={subject} onValueChange={v => { setSubject(v); setTopic(''); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Ders seç *" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subject && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input value={topicSearch} onChange={e => setTopicSearch(e.target.value)} placeholder="Konu ara..." className="pl-8 rounded-xl text-sm" />
                </div>
                {topicSearch && topicResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-0.5 bg-muted rounded-xl p-1.5">
                    {topicResults.map(t => (
                      <button key={t.id} onClick={() => { setTopic(t.name); setTopicSearch(''); }}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-accent transition-colors">
                        {t.name} <span className="text-muted-foreground">– {t.subject}</span>
                      </button>
                    ))}
                  </div>
                )}
                {topic && (
                  <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-lg inline-block">
                    Konu: {topic}
                  </div>
                )}
                {!topicSearch && !topic && (
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger className="rounded-xl text-sm"><SelectValue placeholder="Konu seç (opsiyonel)" /></SelectTrigger>
                    <SelectContent>
                      {subjects.find(s => s.name === subject)?.topics.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            <Input type="number" placeholder="Toplam soru sayısı" value={totalQ} onChange={e => setTotalQ(e.target.value)} className="rounded-xl" />
            <Button onClick={handleCreate} disabled={!name.trim() || !subject} className="w-full rounded-xl">Oluştur</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Entry Dialog */}
      <Dialog open={!!resultDialog} onOpenChange={v => !v && setResultDialog(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Sonuç Gir — {resultDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Doğru</label>
                <Input type="number" value={correct} onChange={e => setCorrect(e.target.value)} className="rounded-xl h-9" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Yanlış</label>
                <Input type="number" value={wrong} onChange={e => setWrong(e.target.value)} className="rounded-xl h-9" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Boş</label>
                <Input type="number" value={blank} onChange={e => setBlank(e.target.value)} className="rounded-xl h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Çözüm Süresi (dk)</label>
                <Input type="number" value={solveDur} onChange={e => setSolveDur(e.target.value)} className="rounded-xl h-9" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Analiz Süresi (dk)</label>
                <Input type="number" value={analysisDur} onChange={e => setAnalysisDur(e.target.value)} className="rounded-xl h-9" />
              </div>
            </div>
            {correct && wrong && (
              <div className="text-center">
                <span className="text-sm font-bold text-primary">
                  Net: {net(parseInt(correct) || 0, parseInt(wrong) || 0)}
                </span>
              </div>
            )}
            <Button onClick={handleSaveResult} className="w-full rounded-xl">Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
