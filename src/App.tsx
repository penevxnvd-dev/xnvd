import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Interviews from "./pages/Interviews";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import TrainingPage from "./pages/realtor/TrainingPage";
import TrainingCalendarPage from "./pages/realtor/TrainingCalendarPage";
import TrainingProgressPage from "./pages/realtor/TrainingProgressPage";
import { getEnv } from "@/lib/env";

// Validate environment variables on app start
try {
  getEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
}

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

const App = () => (
  <ErrorBoundary>
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
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/training-calendar" element={<TrainingCalendarPage />} />
            <Route path="/training-progress" element={<TrainingProgressPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
