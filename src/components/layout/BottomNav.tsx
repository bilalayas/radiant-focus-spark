import { useLocation, useNavigate } from 'react-router-dom';
import { Timer, Calendar, BarChart3, Settings, Users, Shield, Youtube, BookOpen } from 'lucide-react';
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
      { path: '/', icon: Shield },
      { path: '/resources', icon: BookOpen },
      { path: '/settings', icon: Settings },
    ];
  } else if (isTeacherMode) {
    tabs = [
      { path: '/', icon: Users },
      { path: '/settings', icon: Settings },
    ];
  } else {
    tabs = [
      { path: '/', icon: Timer },
      { path: '/planning', icon: Calendar },
      { path: '/youtube', icon: Youtube },
      { path: '/analytics', icon: BarChart3 },
      { path: '/settings', icon: Settings },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-t-2xl shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] border-t border-border">
          <div className="flex justify-around items-center h-14 px-2">
            {tabs.map(tab => {
              const isActive = location.pathname === tab.path ||
                (tab.path === '/' && location.pathname.startsWith('/student/'));
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <tab.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
