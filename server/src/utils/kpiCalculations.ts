// Утилити за изчисляване на KPI на различни нива от топологията

export interface KPIMetrics {
  realtors: number;
  deals: number;
  diagnoses: number;
  successRate: number; // Успеваемост = Сделки / Диагнози
  totalDealValue: number;
  levelDistribution: Record<number, number>; // Разпределение по нива
}

export interface RealtorData {
  id: string;
  level: number;
  deals: Array<{ deal_value: string; deal_date: string }>;
  diagnoses: Array<{ diagnosis_date: string }>;
}

// Изчисляване на KPI за реализатор
export const calculateRealtorKPI = (
  deals: Array<{ deal_value: string; deal_date: string }>,
  diagnoses: Array<{ diagnosis_date: string }>
): KPIMetrics => {
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  const monthDeals = deals.filter(
    (deal) => new Date(deal.deal_date) >= currentMonth
  );
  const monthDiagnoses = diagnoses.filter(
    (diagnosis) => new Date(diagnosis.diagnosis_date) >= currentMonth
  );

  const successRate =
    monthDiagnoses.length > 0
      ? Math.round((monthDeals.length / monthDiagnoses.length) * 100)
      : 0;

  const totalDealValue = monthDeals.reduce(
    (sum, deal) => sum + Number(deal.deal_value),
    0
  );

  return {
    realtors: 1,
    deals: monthDeals.length,
    diagnoses: monthDiagnoses.length,
    successRate,
    totalDealValue,
    levelDistribution: {},
  };
};

// Изчисляване на KPI за екип
export const calculateTeamKPI = (realtors: RealtorData[]): KPIMetrics => {
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  let totalDeals = 0;
  let totalDiagnoses = 0;
  let totalDealValue = 0;
  const levelDistribution: Record<number, number> = {};

  realtors.forEach((realtor) => {
    const monthDeals = realtor.deals.filter(
      (deal) => new Date(deal.deal_date) >= currentMonth
    );
    const monthDiagnoses = realtor.diagnoses.filter(
      (diagnosis) => new Date(diagnosis.diagnosis_date) >= currentMonth
    );

    totalDeals += monthDeals.length;
    totalDiagnoses += monthDiagnoses.length;
    totalDealValue += monthDeals.reduce(
      (sum, deal) => sum + Number(deal.deal_value),
      0
    );

    // Разпределение по нива
    if (!levelDistribution[realtor.level]) {
      levelDistribution[realtor.level] = 0;
    }
    levelDistribution[realtor.level]++;
  });

  const successRate =
    totalDiagnoses > 0
      ? Math.round((totalDeals / totalDiagnoses) * 100)
      : 0;

  return {
    realtors: realtors.length,
    deals: totalDeals,
    diagnoses: totalDiagnoses,
    successRate,
    totalDealValue,
    levelDistribution,
  };
};

// Изчисляване на KPI за офис (агрегиране на всички екипи)
export const calculateOfficeKPI = (teams: RealtorData[][]): KPIMetrics => {
  const allRealtors: RealtorData[] = teams.flat();
  return calculateTeamKPI(allRealtors);
};

// Изчисляване на KPI за град (агрегиране на всички офиси)
export const calculateCityKPI = (offices: RealtorData[][]): KPIMetrics => {
  const allRealtors: RealtorData[] = offices.flat();
  return calculateTeamKPI(allRealtors);
};

// Изчисляване на KPI за държава (агрегиране на всички градове)
export const calculateCountryKPI = (cities: RealtorData[][]): KPIMetrics => {
  const allRealtors: RealtorData[] = cities.flat();
  return calculateTeamKPI(allRealtors);
};

// Форматиране на успеваемост
export const formatSuccessRate = (rate: number): string => {
  return `${rate}%`;
};

// Форматиране на стойност на сделки
export const formatDealValue = (value: number): string => {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'BGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

