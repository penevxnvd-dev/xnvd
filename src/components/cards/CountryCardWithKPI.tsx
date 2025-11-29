import { useState, useEffect } from 'react';
import { CountryCard } from './CountryCard';
import { api } from '@/lib/api';
import { KPIMetrics } from '@/utils/kpiCalculations';

interface CountryCardWithKPIProps {
  country: {
    id: string;
    name: string;
    code: string;
  };
  onClick?: () => void;
}

export const CountryCardWithKPI = ({ country, onClick }: CountryCardWithKPIProps) => {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const kpi = await api.getCountryKPI(country.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching country KPI:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchKPI();
  }, [country.id]);

  return <CountryCard country={country} metrics={metrics} onClick={onClick} />;
};

