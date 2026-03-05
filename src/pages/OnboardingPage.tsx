import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, BookOpen, Sparkles, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FIELD_LABELS, type StudentField } from '@/data/curriculum';
import { Button } from '@/components/ui/button';

const options = [
  { id: 'exam', label: 'Sınav Hazırlığı', icon: GraduationCap },
  { id: 'university', label: 'Üniversite (YKS)', icon: BookOpen },
  { id: 'productivity', label: 'Genel Üretkenlik', icon: Sparkles },
  { id: 'free', label: 'Serbest Kullanım', icon: Compass },
];

const fieldOptions: { id: StudentField; label: string; desc: string }[] = [
  { id: 'sayisal', label: 'Sayısal', desc: 'Matematik, Fizik, Kimya, Biyoloji' },
  { id: 'sozel', label: 'Sözel', desc: 'Edebiyat, Tarih, Coğrafya, Felsefe' },
  { id: 'esit_agirlik', label: 'Eşit Ağırlık', desc: 'Matematik, Edebiyat, Tarih, Coğrafya' },
  { id: 'yabanci_dil', label: 'Yabancı Dil', desc: 'İngilizce ve diğer diller' },
];

type Step = 'useCase' | 'examType' | 'field';

export default function OnboardingPage() {
  const { updateSettings } = useApp();
  const { user } = useAuth();
  const { updateProfile } = useProfile(user);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('useCase');
  const [selectedUseCase, setSelectedUseCase] = useState('');
  const [examType, setExamType] = useState<'tyt_only' | 'ayt' | null>(null);

  const handleSelectUseCase = (useCase: string) => {
    setSelectedUseCase(useCase);
    if (useCase === 'university') {
      setStep('examType');
    } else {
      finishOnboarding(useCase);
    }
  };

  const handleExamType = (type: 'tyt_only' | 'ayt') => {
    setExamType(type);
    if (type === 'ayt') {
      setStep('field');
    } else {
      finishOnboarding('university');
    }
  };

  const handleFieldSelect = async (field: StudentField) => {
    await updateProfile({ student_field: field });
    finishOnboarding('university');
  };

  const finishOnboarding = async (useCase: string) => {
    await updateProfile({ use_case: useCase });
    updateSettings({ onboardingDone: true, useCase });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === 'useCase' && (
          <motion.div key="useCase" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm">
            <div className="text-center mb-10">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-primary" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">CheckTime'a Hoş Geldin</h1>
              <p className="text-sm text-muted-foreground">Zamanını yönet, hedeflerine ulaş. Ne için kullanacaksın?</p>
            </div>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <motion.button key={opt.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08 }}
                  onClick={() => handleSelectUseCase(opt.id)}
                  className="w-full flex items-center gap-4 bg-card rounded-2xl px-5 py-4 border border-border shadow-sm hover:border-primary/40 hover:bg-accent/50 transition-all active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                    <opt.icon size={20} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">{opt.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'examType' && (
          <motion.div key="examType" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground mb-2">Sınav Türü</h2>
              <p className="text-sm text-muted-foreground">Hangi sınava hazırlanıyorsun?</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => handleExamType('tyt_only')}
                className="w-full flex flex-col bg-card rounded-2xl px-5 py-4 border border-border shadow-sm hover:border-primary/40 transition-all active:scale-[0.98]">
                <span className="text-sm font-bold text-foreground">Sadece TYT</span>
                <span className="text-xs text-muted-foreground mt-0.5">Temel Yeterlilik Testi</span>
              </button>
              <button onClick={() => handleExamType('ayt')}
                className="w-full flex flex-col bg-card rounded-2xl px-5 py-4 border border-border shadow-sm hover:border-primary/40 transition-all active:scale-[0.98]">
                <span className="text-sm font-bold text-foreground">TYT + AYT</span>
                <span className="text-xs text-muted-foreground mt-0.5">Temel + Alan Yeterlilik Testi</span>
              </button>
            </div>
            <button onClick={() => setStep('useCase')} className="text-xs text-muted-foreground mt-4 hover:text-foreground">← Geri</button>
          </motion.div>
        )}

        {step === 'field' && (
          <motion.div key="field" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-foreground mb-2">Alan Seçimi</h2>
              <p className="text-sm text-muted-foreground">AYT'de hangi alanda sınava gireceksin?</p>
            </div>
            <div className="space-y-3">
              {fieldOptions.map(opt => (
                <button key={opt.id} onClick={() => handleFieldSelect(opt.id)}
                  className="w-full flex flex-col bg-card rounded-2xl px-5 py-4 border border-border shadow-sm hover:border-primary/40 transition-all active:scale-[0.98]">
                  <span className="text-sm font-bold text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep('examType')} className="text-xs text-muted-foreground mt-4 hover:text-foreground">← Geri</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
