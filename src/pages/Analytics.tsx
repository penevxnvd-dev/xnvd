import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatNumber } from '@/utils/calculations';
import { Building2, Users, Handshake, BarChart3, Stethoscope, Trophy, Medal, Activity, Target, Award, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { AppLayout } from '@/components/layouts/AppLayout';
import { formatNameWithEmoji } from '@/utils/nameEmojis';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatBadge } from '@/components/StatBadge';

interface RealtorStats {
  id: string;
  name: string;
  dealsCount: number;
  diagnosesCount: number;
  successRate: number; // diagnoses/deals * 100
  officeName?: string;
  teamName?: string;
}

interface OfficeStats {
  name: string;
  realtorsCount: number;
  dealsCount: number;
  diagnosesCount: number;
  successRate: number;
}

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [realtors, setRealtors] = useState<RealtorStats[]>([]);
  const [offices, setOffices] = useState<OfficeStats[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState({
    totalOffices: 0,
    totalRealtors: 0,
    totalDeals: 0,
    totalDiagnoses: 0,
    averageSuccessRate: 0,
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const officesData = await api.getAllOfficesFull();
      
      // Extract all realtors with their deals and diagnoses
      const realtorsMap = new Map<string, RealtorStats>();
      
      let totalDeals = 0;
      let totalDiagnoses = 0;
      
      officesData.forEach((office: any) => {
        const officeName = office.name || 'Неизвестен офис';
        const teams = office.teams || [];
        
        teams.forEach((team: any) => {
          const teamName = team.name || 'Без екип';
          const realtorsList = team.realtors || [];
          
          realtorsList.forEach((realtor: any) => {
            const profile = realtor.profile || {};
            const realtorName = profile.full_name || 'Неизвестен';
            const deals = realtor.deals || [];
            const diagnoses = realtor.diagnoses || [];
            
            const dealsCount = deals.length;
            const diagnosesCount = diagnoses.length;
            const successRate = dealsCount > 0 ? (diagnosesCount / dealsCount) * 100 : 0;
            
            totalDeals += dealsCount;
            totalDiagnoses += diagnosesCount;
            
            if (!realtorsMap.has(realtor.id)) {
              realtorsMap.set(realtor.id, {
                id: realtor.id,
                name: realtorName,
                dealsCount,
                diagnosesCount,
                successRate,
                officeName,
                teamName,
              });
            } else {
              // If realtor appears in multiple teams, aggregate the data
              const existing = realtorsMap.get(realtor.id)!;
              existing.dealsCount += dealsCount;
              existing.diagnosesCount += diagnosesCount;
              existing.successRate = existing.dealsCount > 0 
                ? (existing.diagnosesCount / existing.dealsCount) * 100 
                : 0;
            }
          });
        });
      });
      
      const realtorsList = Array.from(realtorsMap.values());
      
      // Calculate office stats
      const officeStatsMap = new Map<string, OfficeStats>();
      
      officesData.forEach((office: any) => {
        const officeName = office.name || 'Неизвестен офис';
        const teams = office.teams || [];
        
        let officeRealtors = 0;
        let officeDeals = 0;
        let officeDiagnoses = 0;
        
        teams.forEach((team: any) => {
          const realtorsList = team.realtors || [];
          officeRealtors += realtorsList.length;
          
          realtorsList.forEach((realtor: any) => {
            const deals = realtor.deals || [];
            const diagnoses = realtor.diagnoses || [];
            officeDeals += deals.length;
            officeDiagnoses += diagnoses.length;
          });
        });

        const officeSuccessRate = officeDeals > 0 ? (officeDiagnoses / officeDeals) * 100 : 0;
        
        officeStatsMap.set(officeName, {
          name: officeName,
          realtorsCount: officeRealtors,
          dealsCount: officeDeals,
          diagnosesCount: officeDiagnoses,
          successRate: officeSuccessRate,
        });
      });
      
      const officesList = Array.from(officeStatsMap.values());
      
      // Calculate global metrics
      const averageSuccessRate = totalDeals > 0 ? (totalDiagnoses / totalDeals) * 100 : 0;
      
      setRealtors(realtorsList);
      setOffices(officesList);
      setGlobalMetrics({
        totalOffices: officesData.length,
        totalRealtors: realtorsList.length,
        totalDeals,
        totalDiagnoses,
        averageSuccessRate,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sort realtors by different criteria
  const realtorsBySuccessRate = [...realtors]
    .filter(r => r.dealsCount > 0)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);
  
  const realtorsByDeals = [...realtors]
    .sort((a, b) => b.dealsCount - a.dealsCount)
    .slice(0, 10);
  
  const realtorsByDiagnoses = [...realtors]
    .sort((a, b) => b.diagnosesCount - a.diagnosesCount)
    .slice(0, 10);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="text-muted-foreground font-semibold">{index + 1}</span>;
  };

  // Navbar stats content
  const customNavbarContent = (
    <div className="flex items-center gap-1.5 sm:gap-2 ml-2 sm:ml-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-16 rounded-lg" />
        ))
      ) : (
        <>
          <StatBadge
            icon={Building2}
            value={globalMetrics.totalOffices}
            title="Общо офиси"
            colorScheme="blue"
          />
          <StatBadge
            icon={Users}
            value={formatNumber(globalMetrics.totalRealtors)}
            title="Общо реализатори"
            colorScheme="purple"
          />
          <StatBadge
            icon={Handshake}
            value={formatNumber(globalMetrics.totalDeals)}
            title="Общо сделки"
            colorScheme="amber"
          />
          <StatBadge
            icon={Stethoscope}
            value={formatNumber(globalMetrics.totalDiagnoses)}
            title="Общо диагнози"
            colorScheme="pink"
          />
          <StatBadge
            icon={BarChart3}
            value={`${globalMetrics.averageSuccessRate.toFixed(1)}%`}
            title="Средна успеваемост"
            colorScheme="green"
          />
        </>
      )}
    </div>
  );

  if (loading) {
  return (
      <AppLayout
        customNavbarContent={
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">Калсация</h1>
            </div>
        }
      >
        <div className="container mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      customNavbarContent={
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">Калсация</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">Детайлен преглед на представянето</p>
              </div>
          {customNavbarContent}
        </div>
      }
    >
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Office Performance Bar Chart */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Сравнение на офисите
              </h3>
              <Badge variant="secondary" className="text-xs">
                {offices.length} офиси
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={offices}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-15}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="dealsCount" fill="hsl(var(--primary))" name="Сделки" />
                <Bar dataKey="diagnosesCount" fill="hsl(var(--success))" name="Диагнози" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Office Success Rate Pie Chart */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-success" />
                Успеваемост по офиси
              </h3>
              <Badge variant="secondary" className="text-xs">
                {offices.filter(o => o.dealsCount > 0).length} активни
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={offices.filter(o => o.dealsCount > 0)}
                  dataKey="successRate"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.successRate.toFixed(1)}%`}
                  labelLine={false}
                >
                  {offices.filter(o => o.dealsCount > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Realtor Rankings - Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Top by Success Rate */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-foreground">Топ по успеваемост</h3>
            </div>
            <div className="space-y-3">
              {realtorsBySuccessRate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Няма данни</p>
                </div>
              ) : (
                realtorsBySuccessRate.map((realtor, index) => (
                  <div 
                    key={realtor.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index)}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-primary/30 flex-shrink-0">
                      {realtor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{formatNameWithEmoji(realtor.name)}</p>
                      <p className="text-xs text-muted-foreground truncate">{realtor.officeName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-success text-sm">{realtor.successRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">{realtor.dealsCount} сделки</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Top by Deals */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-success" />
              <h3 className="text-lg font-semibold text-foreground">Най-много сделки</h3>
            </div>
            <div className="space-y-3">
              {realtorsByDeals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Няма данни</p>
                </div>
              ) : (
                realtorsByDeals.map((realtor, index) => (
                  <div 
                    key={realtor.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index)}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-primary/30 flex-shrink-0">
                      {realtor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{formatNameWithEmoji(realtor.name)}</p>
                      <p className="text-xs text-muted-foreground truncate">{realtor.officeName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-foreground text-sm">{realtor.dealsCount}</p>
                      <p className="text-xs text-muted-foreground">{realtor.diagnosesCount} диагнози</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Top by Diagnoses */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-semibold text-foreground">Най-много диагнози</h3>
            </div>
            <div className="space-y-3">
              {realtorsByDiagnoses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Няма данни</p>
                </div>
              ) : (
                realtorsByDiagnoses.map((realtor, index) => (
                  <div 
                    key={realtor.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-border"
                  >
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index)}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-primary/30 flex-shrink-0">
                      {realtor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{formatNameWithEmoji(realtor.name)}</p>
                      <p className="text-xs text-muted-foreground truncate">{realtor.officeName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-foreground text-sm">{realtor.diagnosesCount}</p>
                      <p className="text-xs text-muted-foreground">{realtor.dealsCount} сделки</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Office Details Table */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Преглед на офисите
            </h3>
            <Badge variant="secondary" className="text-xs">
              {offices.length} общо
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Офис</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Реализатори</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Сделки</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Диагнози</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Успеваемост</th>
                </tr>
              </thead>
              <tbody>
                {offices.map((office, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                      <td className="py-3 px-4 font-medium text-foreground">{office.name}</td>
                    <td className="py-3 px-4 text-right text-foreground">{office.realtorsCount}</td>
                    <td className="py-3 px-4 text-right text-foreground">{office.dealsCount}</td>
                    <td className="py-3 px-4 text-right text-foreground">{office.diagnosesCount}</td>
                    <td className="py-3 px-4 text-right">
                      {office.dealsCount > 0 ? (
                        <span className="font-semibold text-success">{office.successRate.toFixed(1)}%</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">N/A</span>
                      )}
                    </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </div>
    </AppLayout>
  );
};

export default Analytics;
