import { Office, TeamLeader, Agent, Deal } from '@/types';

export const calculateDealMetrics = (deals: Deal[]) => {
  const totalDeals = deals.length;
  const totalTurnover = deals.reduce((sum, deal) => sum + deal.dealValue, 0);
  const totalProfit = deals.reduce((sum, deal) => sum + deal.netProfit, 0);
  const averageDealSize = totalDeals > 0 ? totalTurnover / totalDeals : 0;

  return {
    totalDeals,
    totalTurnover,
    totalProfit,
    averageDealSize,
  };
};

export const calculateAgentMetrics = (agent: Agent) => {
  return calculateDealMetrics(agent.deals);
};

export const calculateLeaderMetrics = (leader: TeamLeader) => {
  const allDeals = leader.teamMembers.flatMap((agent) => agent.deals);
  return calculateDealMetrics(allDeals);
};

export const calculateOfficeMetrics = (office: Office) => {
  const allDeals = office.teamLeaders.flatMap((leader) =>
    leader.teamMembers.flatMap((agent) => agent.deals)
  );
  const totalEmployees =
    office.teamLeaders.length +
    office.teamLeaders.reduce((sum, leader) => sum + leader.teamMembers.length, 0);

  return {
    ...calculateDealMetrics(allDeals),
    totalEmployees,
  };
};

export const getAllAgents = (offices: Office[]): Agent[] => {
  return offices.flatMap((office) =>
    office.teamLeaders.flatMap((leader) => leader.teamMembers)
  );
};

export const rankAgentsByProfit = (agents: Agent[]) => {
  return [...agents].sort((a, b) => {
    const profitA = calculateAgentMetrics(a).totalProfit;
    const profitB = calculateAgentMetrics(b).totalProfit;
    return profitB - profitA;
  });
};

export const rankAgentsByDeals = (agents: Agent[]) => {
  return [...agents].sort((a, b) => b.deals.length - a.deals.length);
};

export const getAgentRank = (agent: Agent, rankedAgents: Agent[]) => {
  return rankedAgents.findIndex((a) => a.id === agent.id) + 1;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};
