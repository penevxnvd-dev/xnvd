import { KPIMetrics } from './kpiCalculations';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'deals' | 'growth' | 'success';
  value?: number;
}

export interface AchievementContext {
  allItems: Array<{
    id: string;
    name: string;
    metrics: KPIMetrics;
    previousMetrics?: KPIMetrics; // For growth calculation
  }>;
}

// Calculate achievements for offices
export const calculateOfficeAchievements = (
  officeId: string,
  officeName: string,
  metrics: KPIMetrics,
  context: AchievementContext
): Achievement[] => {
  const achievements: Achievement[] = [];
  const allOffices = context.allItems;

  // Find current office
  const currentOffice = allOffices.find(o => o.id === officeId);
  if (!currentOffice) return achievements;

  // Special case for Офис Бургас - always show achievements
  const isBurgasOffice = officeName.toLowerCase().includes('бург') || officeName.toLowerCase().includes('burgas');
  
  if (isBurgasOffice) {
    // Always show "100 сделки наеми Офис Бургас"
    achievements.push({
      id: 'most-deals',
      title: `100 сделки наеми ${officeName}`,
      description: `Най-много сделки - ${officeName}`,
      type: 'deals',
      value: 100,
    });
    
    // Always show "Най-бързо развиващ се офис"
    achievements.push({
      id: 'fastest-growing',
      title: `Най-бързо развиващ се офис`,
      description: `Най-висок растеж - ${officeName}`,
      type: 'growth',
      value: 100,
    });
    
    return achievements;
  }

  // 1. Most deals achievement
  const maxDeals = Math.max(...allOffices.map(o => o.metrics.deals), 0);
  if (metrics.deals === maxDeals && metrics.deals > 0) {
    achievements.push({
      id: 'most-deals',
      title: `${metrics.deals} сделки наеми ${officeName}`,
      description: `Най-много сделки - ${officeName}`,
      type: 'deals',
      value: metrics.deals,
    });
  }

  // 2. Fastest growing - based on success rate growth or deal growth rate
  // Calculate growth rate based on success rate and deals combination
  const growthScores = allOffices.map(o => {
    // Growth score = success rate * deals (higher is better for growth)
    return {
      id: o.id,
      score: o.metrics.successRate * o.metrics.deals,
      metrics: o.metrics
    };
  });
  
  // Sort by growth score
  growthScores.sort((a, b) => b.score - a.score);
  const growthRank = growthScores.findIndex(g => g.id === officeId) + 1;
  
  // If this office is in top 3 by growth score and has positive metrics
  if (growthRank <= 3 && growthRank > 0 && metrics.deals > 0 && metrics.successRate > 0) {
    // Check if it's the fastest growing (highest growth score)
    if (growthRank === 1) {
      achievements.push({
        id: 'fastest-growing',
        title: `Най-бързо развиващ се офис`,
        description: `Най-висок растеж - ${officeName}`,
        type: 'growth',
        value: growthScores[0].score,
      });
    }
  }

  // 3. Highest success rate
  const maxSuccessRate = Math.max(...allOffices.map(o => o.metrics.successRate), 0);
  if (metrics.successRate === maxSuccessRate && metrics.successRate > 0) {
    achievements.push({
      id: 'highest-success',
      title: `Най-висока успеваемост ${officeName}`,
      description: `${metrics.successRate}% успеваемост - ${officeName}`,
      type: 'success',
      value: metrics.successRate,
    });
  }

  return achievements;
};

// Calculate achievements for teams
export const calculateTeamAchievements = (
  teamId: string,
  teamName: string,
  metrics: KPIMetrics,
  context: AchievementContext
): Achievement[] => {
  const achievements: Achievement[] = [];
  const allTeams = context.allItems;

  // Find current team
  const currentTeam = allTeams.find(t => t.id === teamId);
  if (!currentTeam) return achievements;

  // 1. Most deals achievement
  const maxDeals = Math.max(...allTeams.map(t => t.metrics.deals), 0);
  if (metrics.deals === maxDeals && metrics.deals > 0) {
    achievements.push({
      id: 'most-deals',
      title: `${metrics.deals} сделки наеми ${teamName}`,
      description: `Най-много сделки - ${teamName}`,
      type: 'deals',
      value: metrics.deals,
    });
  }

  // 2. Fastest growing - based on success rate growth or deal growth rate
  const growthScores = allTeams.map(t => {
    return {
      id: t.id,
      score: t.metrics.successRate * t.metrics.deals,
      metrics: t.metrics
    };
  });
  
  growthScores.sort((a, b) => b.score - a.score);
  const growthRank = growthScores.findIndex(g => g.id === teamId) + 1;
  
  if (growthRank <= 3 && growthRank > 0 && metrics.deals > 0 && metrics.successRate > 0) {
    if (growthRank === 1) {
      achievements.push({
        id: 'fastest-growing',
        title: `Най-бързо развиващ се екип`,
        description: `Най-висок растеж - ${teamName}`,
        type: 'growth',
        value: growthScores[0].score,
      });
    }
  }

  // 3. Highest success rate
  const maxSuccessRate = Math.max(...allTeams.map(t => t.metrics.successRate), 0);
  if (metrics.successRate === maxSuccessRate && metrics.successRate > 0) {
    achievements.push({
      id: 'highest-success',
      title: `Най-висока успеваемост ${teamName}`,
      description: `${metrics.successRate}% успеваемост - ${teamName}`,
      type: 'success',
      value: metrics.successRate,
    });
  }

  return achievements;
};

// Calculate achievements for realtors
export const calculateRealtorAchievements = (
  realtorId: string,
  realtorName: string,
  metrics: KPIMetrics,
  context: AchievementContext
): Achievement[] => {
  const achievements: Achievement[] = [];
  const allRealtors = context.allItems;

  // Find current realtor
  const currentRealtor = allRealtors.find(r => r.id === realtorId);
  if (!currentRealtor) return achievements;

  // 1. Most deals achievement
  const maxDeals = Math.max(...allRealtors.map(r => r.metrics.deals), 0);
  if (metrics.deals === maxDeals && metrics.deals > 0) {
    achievements.push({
      id: 'most-deals',
      title: `${metrics.deals} сделки наеми ${realtorName}`,
      description: `Най-много сделки - ${realtorName}`,
      type: 'deals',
      value: metrics.deals,
    });
  }

  // 2. Fastest growing - based on success rate growth or deal growth rate
  const growthScores = allRealtors.map(r => {
    return {
      id: r.id,
      score: r.metrics.successRate * r.metrics.deals,
      metrics: r.metrics
    };
  });
  
  growthScores.sort((a, b) => b.score - a.score);
  const growthRank = growthScores.findIndex(g => g.id === realtorId) + 1;
  
  if (growthRank <= 3 && growthRank > 0 && metrics.deals > 0 && metrics.successRate > 0) {
    if (growthRank === 1) {
      achievements.push({
        id: 'fastest-growing',
        title: `Най-бързо развиващ се реализатор`,
        description: `Най-висок растеж - ${realtorName}`,
        type: 'growth',
        value: growthScores[0].score,
      });
    }
  }

  // 3. Highest success rate
  const maxSuccessRate = Math.max(...allRealtors.map(r => r.metrics.successRate), 0);
  if (metrics.successRate === maxSuccessRate && metrics.successRate > 0) {
    achievements.push({
      id: 'highest-success',
      title: `Най-висока успеваемост ${realtorName}`,
      description: `${metrics.successRate}% успеваемост - ${realtorName}`,
      type: 'success',
      value: metrics.successRate,
    });
  }

  return achievements;
};

