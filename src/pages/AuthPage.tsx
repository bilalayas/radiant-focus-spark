import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Şifre sıfırlama bağlantısı gönderildi!');
        setMode('login');
      }
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error('Şifreler eşleşmiyor');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error('Şifre en az 6 karakter olmalı');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName || undefined);
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Hesap oluşturuldu! E-postanızı kontrol edin.');
      }
      return;
    }

    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error('Giriş başarısız: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-primary" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">CheckTime</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Hesabınıza giriş yapın' : mode === 'register' ? 'Yeni hesap oluşturun' : 'Şifrenizi sıfırlayın'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ad Soyad"
                className="pl-9 rounded-xl"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-posta"
              required
              className="pl-9 rounded-xl"
            />
          </div>
          {mode !== 'forgot' && (
            <>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Şifre"
                  required
                  minLength={6}
                  className="pl-9 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'register' && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Şifre Tekrar"
                    required
                    minLength={6}
                    className="pl-9 pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )}
            </>
          )}
          <Button type="submit" className="w-full h-11 rounded-2xl font-semibold" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Bağlantı Gönder'}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('forgot')} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Şifremi unuttum
              </button>
              <p className="text-xs text-muted-foreground">
                Hesabınız yok mu?{' '}
                <button onClick={() => setMode('register')} className="text-primary font-medium hover:underline">
                  Kayıt Ol
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p className="text-xs text-muted-foreground">
              Zaten hesabınız var mı?{' '}
              <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">
                Giriş Yap
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-xs text-primary font-medium hover:underline">
              Giriş'e dön
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
