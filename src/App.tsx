import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { InstallPrompt } from "@/components/InstallPrompt";
import HomePage from "./pages/HomePage";
import PlanningPage from "./pages/PlanningPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import OnboardingPage from "./pages/OnboardingPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDetailPage from "./pages/StudentDetailPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { settings, user, authLoading, profile, activeRole, hasRole } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // Check onboarding from profile use_case (persisted in Supabase)
  const onboardingDone = !!profile?.use_case || settings.onboardingDone;

  if (!onboardingDone) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Teacher mode
  if (activeRole === 'teacher' && hasRole('teacher')) {
    return (
      <Routes>
        <Route path="/" element={<AppLayout><TeacherDashboard /></AppLayout>} />
        <Route path="/student/:studentId" element={<AppLayout><StudentDetailPage /></AppLayout>} />
        <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
        <Route path="/admin" element={<AppLayout><AdminPage /></AppLayout>} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
      <Route path="/planning" element={<AppLayout><PlanningPage /></AppLayout>} />
      <Route path="/analytics" element={<AppLayout><AnalyticsPage /></AppLayout>} />
      <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
      <Route path="/admin" element={<AppLayout><AdminPage /></AppLayout>} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
