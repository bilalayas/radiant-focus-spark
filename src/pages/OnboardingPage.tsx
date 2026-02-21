import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, BookOpen, Sparkles, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

const options = [
  { id: 'exam', label: 'Sınav Hazırlığı', icon: GraduationCap },
  { id: 'university', label: 'Üniversite (YKS)', icon: BookOpen },
  { id: 'productivity', label: 'Genel Üretkenlik', icon: Sparkles },
  { id: 'free', label: 'Serbest Kullanım', icon: Compass },
];

export default function OnboardingPage() {
  const { updateSettings } = useApp();
  const { user } = useAuth();
  const { updateProfile } = useProfile(user);
  const navigate = useNavigate();

  const handleSelect = async (useCase: string) => {
    // Save to Supabase profile
    await updateProfile({ use_case: useCase });
    // Also update local settings
    updateSettings({ onboardingDone: true, useCase });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-primary" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">CheckTime'a Hoş Geldin</h1>
          <p className="text-sm text-muted-foreground">Zamanını yönet, hedeflerine ulaş. Ne için kullanacaksın?</p>
        </div>

        <div className="space-y-3">
          {options.map((opt, i) => (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
              onClick={() => handleSelect(opt.id)}
              className="w-full flex items-center gap-4 bg-card rounded-2xl px-5 py-4 border border-border shadow-sm hover:border-primary/40 hover:bg-accent/50 transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <opt.icon size={20} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-card-foreground">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
