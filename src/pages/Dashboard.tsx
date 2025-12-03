import { useUserRole } from '@/hooks/useUserRole';
import AdminDashboard from './admin/AdminDashboard';
import RealtorDashboard from './realtor/RealtorDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import logo from '@/assets/logo.jpeg';
import { useEffect } from 'react';

const Dashboard = () => {
  const { role, loading, userId } = useUserRole();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Clear all auth data
    await api.logout();
    navigate('/auth');
  };

  useEffect(() => {
    // Only redirect if explicitly no role after loading (not on initial load)
    if (!loading && !role) {
      // Clear any stored tokens
      localStorage.removeItem('token');
      navigate('/auth');
    }
  }, [loading, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  if (!role) {
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

  if (role === 'admin') {
    return <AdminDashboard userId={userId!} />;
  }

  if (role === 'realtor') {
    return <RealtorDashboard userId={userId!} />;
  }

  return null;
};

export default Dashboard;