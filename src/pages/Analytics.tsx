import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockOffices } from '@/data/mockData';
import {
  calculateOfficeMetrics,
  getAllAgents,
  formatCurrency,
  formatNumber,
} from '@/utils/calculations';
import { Building2, Users, TrendingUp, DollarSign, Award, ArrowLeft } from 'lucide-react';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const Analytics = () => {
  const navigate = useNavigate();
  const allAgents = getAllAgents(mockOffices);
  
  const globalMetrics = {
    totalOffices: mockOffices.length,
    totalAgents: allAgents.length,
    totalDeals: allAgents.reduce((sum, agent) => sum + agent.deals.length, 0),
    totalTurnover: allAgents.reduce(
      (sum, agent) => sum + agent.deals.reduce((s, deal) => s + deal.dealValue, 0),
      0
    ),
    totalProfit: allAgents.reduce(
      (sum, agent) => sum + agent.deals.reduce((s, deal) => s + deal.netProfit, 0),
      0
    ),
  };

  const officeData = mockOffices.map((office) => {
    const metrics = calculateOfficeMetrics(office);
    return {
      name: office.name,
      turnover: metrics.totalTurnover,
      profit: metrics.totalProfit,
      deals: metrics.totalDeals,
    };
  });

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Аналитика</h1>
              <p className="text-muted-foreground mt-1">Детайлен преглед на представянето</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад към офисите
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Global KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общо офиси</p>
                <p className="text-2xl font-bold text-foreground">{globalMetrics.totalOffices}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общо агенти</p>
                <p className="text-2xl font-bold text-foreground">{globalMetrics.totalAgents}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <Award className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общо сделки</p>
                <p className="text-2xl font-bold text-foreground">{formatNumber(globalMetrics.totalDeals)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Общ оборот</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(globalMetrics.totalTurnover)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Обща печалба</p>
                <p className="text-xl font-bold text-success">{formatCurrency(globalMetrics.totalProfit)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Office Performance Bar Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Сравнение на офисите</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={officeData}>
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
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="turnover" fill="hsl(var(--primary))" name="Оборот" />
                <Bar dataKey="profit" fill="hsl(var(--success))" name="Чиста печалба" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Office Distribution Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Разпределение на печалбата по офиси</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={officeData}
                  dataKey="profit"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.profit)}`}
                  labelLine={false}
                >
                  {officeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeaderboardCard
            agents={allAgents}
            title="🏆 Топ изпълнители по печалба"
            sortBy="profit"
            limit={10}
          />
          <LeaderboardCard
            agents={allAgents}
            title="📊 Най-много сделки"
            sortBy="deals"
            limit={10}
          />
        </div>

        {/* Office Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Преглед на офисите</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Офис</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Локация</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Служители</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Сделки</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Оборот</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Чиста печалба</th>
                </tr>
              </thead>
              <tbody>
                {mockOffices.map((office) => {
                  const metrics = calculateOfficeMetrics(office);
                  return (
                    <tr key={office.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{office.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{office.location}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metrics.totalEmployees}</td>
                      <td className="py-3 px-4 text-right text-foreground">{metrics.totalDeals}</td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">{formatCurrency(metrics.totalTurnover)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-success">{formatCurrency(metrics.totalProfit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Разработено от Octa Investment Group
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Analytics;
