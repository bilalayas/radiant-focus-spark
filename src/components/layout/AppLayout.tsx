import { ReactNode, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './BottomNav';
import { useApp } from '@/context/AppContext';

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.28,
};

let prevRouteIdx = 0;

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const { activeRole, hasRole } = useApp();

  const isTeacherMode = activeRole === 'teacher' && hasRole('teacher');
  const isAdminMode = activeRole === 'admin' && hasRole('admin');

  // Routes must match BottomNav tabs for each role
  const routes = useMemo(() => {
    if (isAdminMode) return ['/', '/resources', '/settings'];
    if (isTeacherMode) return ['/', '/settings'];
    return ['/', '/planning', '/analytics', '/helper-resources', '/settings'];
  }, [isAdminMode, isTeacherMode]);

  const currentIdx = routes.indexOf(location.pathname);
  const direction = currentIdx >= prevRouteIdx ? 1 : -1;
  if (currentIdx !== -1) prevRouteIdx = currentIdx;

  // Disable swipe when on a sub-route (e.g. /student/xxx)
  const isSubRoute = currentIdx === -1;

  // Keyboard fix
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const root = document.getElementById('root');
      if (root) root.style.height = `${viewport.height}px`;
    };
    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current || isSubRoute) return;
    const dx = touchRef.current.x - e.changedTouches[0].clientX;
    const dy = Math.abs(touchRef.current.y - e.changedTouches[0].clientY);
    const idx = routes.indexOf(location.pathname);

    if (Math.abs(dx) > 120 && dy < 80 && idx !== -1) {
      if (dx > 0 && idx < routes.length - 1) {
        navigate(routes[idx + 1]);
      } else if (dx < 0 && idx > 0) {
        navigate(routes[idx - 1]);
      }
    }
    touchRef.current = null;
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div
        className="max-w-lg mx-auto pb-16 relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={location.pathname}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            style={{ willChange: 'transform' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
};
