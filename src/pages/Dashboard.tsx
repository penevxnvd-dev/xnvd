import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import logo from '@/assets/logo.jpeg';
import { useEffect, lazy, Suspense, useMemo, useRef, memo } from 'react';

// Lazy load dashboards for code splitting
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const RealtorDashboard = lazy(() => import('./realtor/RealtorDashboard'));
const TeamLeaderDashboard = lazy(() => import('./team-leader/TeamLeaderDashboard'));
const OfficeManagerDashboard = lazy(() => import('./office-manager/OfficeManagerDashboard'));
const RegionalManagerDashboard = lazy(() => import('./regional-manager/RegionalManagerDashboard'));

// Мемоизирай Dashboard компонента за да предотвратиш ненужни ре-рендери
const Dashboard = memo(() => {
  const { role, loading, userId } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear all auth data
    await api.logout();
    navigate('/auth');
  };

  // Мемоизирай effectiveRole за да не се изчислява при всяко рендиране
  const effectiveRole = useMemo(() => {
    if (role) return role;
    try {
      const cached = localStorage.getItem('userRole');
      if (!cached) return null;
      const data = JSON.parse(cached);
      return data.role || null;
    } catch {
      return null;
    }
  }, [role]);

  // Използвай useRef за да предотвратиш ненужни изпълнения на useEffect
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Само ако няма роля след зареждане, redirect към auth
    // Използвай ref за да предотвратиш ненужни redirects
    if (!loading && !effectiveRole && !hasRedirected.current) {
      hasRedirected.current = true;
      localStorage.removeItem('token');
      navigate('/auth');
    }
  }, [loading, effectiveRole, navigate]);

  // Ако има кеширана роля, не показвай loading screen
  if (loading && !effectiveRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  if (!effectiveRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="Logo" className="h-20 w-20 object-contain" />
            </div>
            <CardTitle>Няма назначена роля</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Вашият акаунт все още няма назначена роля. Моля, свържете се с администратор.
              </AlertDescription>
            </Alert>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Изход
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (effectiveRole === 'admin') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>}>
        <AdminDashboard userId={userId!} />
      </Suspense>
    );
  }

  if (effectiveRole === 'realtor' || effectiveRole === 'trainee') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>}>
        <RealtorDashboard userId={userId!} />
      </Suspense>
    );
  }

  if (effectiveRole === 'team_leader') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>}>
        <TeamLeaderDashboard userId={userId!} />
      </Suspense>
    );
  }

  if (effectiveRole === 'office_manager') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>}>
        <OfficeManagerDashboard userId={userId!} />
      </Suspense>
    );
  }

  if (effectiveRole === 'regional_manager') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Зареждане...</div></div>}>
        <RegionalManagerDashboard userId={userId!} />
      </Suspense>
    );
  }

  return null;
});

// Задай displayName за по-лесно дебъгване
Dashboard.displayName = 'Dashboard';

export default Dashboard;