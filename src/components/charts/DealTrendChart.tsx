import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Deal } from '@/types';
import { format, parseISO } from 'date-fns';

interface DealTrendChartProps {
  deals: Deal[];
}

export const DealTrendChart = ({ deals }: DealTrendChartProps) => {
  const sortedDeals = [...deals].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const chartData = sortedDeals.map((deal) => ({
    date: format(parseISO(deal.date), 'MMM dd'),
    dealValue: deal.dealValue,
    netProfit: deal.netProfit,
    deposit: deal.deposit,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="date" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
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
          formatter={(value: number) => `$${value.toLocaleString()}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="dealValue" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          name="Deal Value"
          dot={{ fill: 'hsl(var(--primary))' }}
        />
        <Line 
          type="monotone" 
          dataKey="netProfit" 
          stroke="hsl(var(--success))" 
          strokeWidth={2}
          name="Net Profit"
          dot={{ fill: 'hsl(var(--success))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
