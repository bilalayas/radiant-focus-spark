import { ReactNode, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BottomNav } from './BottomNav';

const routes = ['/', '/planning', '/analytics', '/settings'];

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

  const currentIdx = routes.indexOf(location.pathname);
  const direction = currentIdx >= prevRouteIdx ? 1 : -1;
  prevRouteIdx = currentIdx;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = touchRef.current.x - e.changedTouches[0].clientX;
    const dy = Math.abs(touchRef.current.y - e.changedTouches[0].clientY);
    const currentIdx = routes.indexOf(location.pathname);

    if (Math.abs(dx) > 120 && dy < 80 && currentIdx !== -1) {
      if (dx > 0 && currentIdx < routes.length - 1) {
        navigate(routes[currentIdx + 1]);
      } else if (dx < 0 && currentIdx > 0) {
        navigate(routes[currentIdx - 1]);
      }
    }
    touchRef.current = null;
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div
        className="max-w-lg mx-auto pb-20 relative"
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
