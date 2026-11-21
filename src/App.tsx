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
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TrainingPage from "./pages/realtor/TrainingPage";
import AccountManagementPage from "./pages/AccountManagementPage";
import { analytics } from "@/lib/analytics";
import { SearchDialog } from "@/components/SearchDialog";
import { useState, useEffect } from "react";

// Preload Dashboard sub-components for faster navigation
if (typeof window !== 'undefined') {
  // Preload dashboard components when app loads
  import('./pages/admin/AdminDashboard');
  import('./pages/realtor/RealtorDashboard');
  import('./pages/team-leader/TeamLeaderDashboard');
  import('./pages/office-manager/OfficeManagerDashboard');
  import('./pages/regional-manager/RegionalManagerDashboard');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes (reduced for faster updates)
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch if data exists in cache
      refetchOnReconnect: true, // Refetch on reconnect for fresh data
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
                  <Route path="/training" element={<TrainingPage />} />
                  <Route path="/account-management" element={<AccountManagementPage />} />
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
