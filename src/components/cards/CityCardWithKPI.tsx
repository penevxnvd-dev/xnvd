import { useState, useEffect } from 'react';
import { CityCard } from './CityCard';
import { api } from '@/lib/api';
import { KPIMetrics } from '@/utils/kpiCalculations';

interface CityCardWithKPIProps {
  city: {
    id: string;
    name: string;
    countryName?: string;
  };
  onClick?: () => void;
}

export const CityCardWithKPI = ({ city, onClick }: CityCardWithKPIProps) => {
  const [metrics, setMetrics] = useState<KPIMetrics>({
    realtors: 0,
    deals: 0,
    diagnoses: 0,
    successRate: 0,
    totalDealValue: 0,
    levelDistribution: {}
  });

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const kpi = await api.getCityKPI(city.id);
        setMetrics(kpi);
      } catch (error) {
        console.error('Error fetching city KPI:', error);
      }
    };
    fetchKPI();
  }, [city.id]);

  return <CityCard city={city} metrics={metrics} onClick={onClick} />;
};

