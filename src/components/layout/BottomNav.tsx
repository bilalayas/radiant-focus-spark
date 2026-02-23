import { useLocation, useNavigate } from 'react-router-dom';
import { Timer, Calendar, BarChart3, Settings, Users, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRole, hasRole } = useApp();

  const isTeacherMode = activeRole === 'teacher' && hasRole('teacher');
  const isAdminMode = activeRole === 'admin' && hasRole('admin');

  let tabs;
  if (isAdminMode) {
    tabs = [
      { path: '/', icon: Shield, label: 'Admin' },
      { path: '/settings', icon: Settings, label: 'Ayarlar' },
    ];
  } else if (isTeacherMode) {
    tabs = [
      { path: '/', icon: Users, label: 'Öğrenciler' },
      { path: '/settings', icon: Settings, label: 'Ayarlar' },
    ];
  } else {
    tabs = [
      { path: '/', icon: Timer, label: 'Timer' },
      { path: '/planning', icon: Calendar, label: 'Planlama' },
      { path: '/analytics', icon: BarChart3, label: 'Analiz' },
      { path: '/settings', icon: Settings, label: 'Ayarlar' },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-t-2xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] border-t border-border">
          <div className="flex justify-around items-center h-16 px-2">
            {tabs.map(tab => {
              const isActive = location.pathname === tab.path ||
                (tab.path === '/' && location.pathname.startsWith('/student/'));
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
