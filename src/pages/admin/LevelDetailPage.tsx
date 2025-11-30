import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseApi } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Home, LogOut } from 'lucide-react';
import logo from '@/assets/logo.jpeg';
import { KPICard } from '@/components/KPICard';
import {
  calculateTeamKPI,
  calculateOfficeKPI,
  calculateCityKPI,
  calculateCountryKPI,
  RealtorData,
  KPIMetrics,
} from '@/utils/kpiCalculations';

interface LevelDetailPageProps {
  level: 'country' | 'city' | 'office' | 'team';
  id: string;
  name: string;
  onBack: () => void;
  onHome: () => void;
}

const LevelDetailPage = ({
  level,
  id,
  name,
  onBack,
  onHome,
}: LevelDetailPageProps) => {
  const navigate = useNavigate();
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, [level, id]);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      // TODO: Имплементиране на KPI endpoints в backend
      // За сега KPI изчисленията са опростени
      setKpiMetrics(null);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseApi.logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Зареждане...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">{name}</h1>
                <p className="text-xs text-muted-foreground">KPI и статистики</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={onHome} variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Начало
              </Button>
              <Button onClick={onBack} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Изход
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {kpiMetrics ? (
          <KPICard metrics={kpiMetrics} title={name} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Няма данни за показване
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LevelDetailPage;

