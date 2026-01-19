import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";
import { EnvCheck } from "@/components/EnvCheck";
import '@/i18n/config';
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Interviews from "./pages/Interviews";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TrainingPage from "./pages/realtor/TrainingPage";
import TrainingCalendarPage from "./pages/realtor/TrainingCalendarPage";
import TrainingProgressPage from "./pages/realtor/TrainingProgressPage";
import TrainingListPage from "./pages/realtor/TrainingListPage";
import { analytics } from "@/lib/analytics";
import { SearchDialog } from "@/components/SearchDialog";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    // Track page views
    analytics.trackPageView(window.location.pathname);
  }, []);

  return (
    <ErrorBoundary>
      <EnvCheck>
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true,
                }}
              >
                <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
                <Routes>
                  <Route path="/" element={<Auth />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/interviews" element={<Interviews />} />
                  <Route path="/training" element={<TrainingPage />} />
                  <Route path="/training-calendar" element={<TrainingCalendarPage />} />
                  <Route path="/training-progress" element={<TrainingProgressPage />} />
                  <Route path="/training-list" element={<TrainingListPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </EnvCheck>
    </ErrorBoundary>
  );
};

export default App;
