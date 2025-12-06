import { Office, TeamLeader, Agent, Deal } from '@/types';
import { formatNameWithEmoji, formatNameWithoutElevenEleven } from '@/utils/nameEmojis';

// Map level number to AgentLevel string
const levelMap: Record<number, 'Чирак' | 'Реализатор' | 'Елит'> = {
  1: 'Чирак',
  2: 'Реализатор',
  3: 'Реализатор',
  4: 'Елит',
  5: 'Елит'
};

// Database deal type
interface DbDeal {
  id: string;
  dealDate: string | Date;
  clientName: string;
  commission?: number | null;
  dealValue: number;
}

// Transform database deal to frontend Deal
function transformDeal(dbDeal: DbDeal): Deal {
  return {
    id: dbDeal.id,
    date: new Date(dbDeal.dealDate).toISOString().split('T')[0],
    client: dbDeal.clientName,
    deposit: Number(dbDeal.commission || 0),
    dealValue: Number(dbDeal.dealValue),
    expenses: Number(dbDeal.dealValue) - Number(dbDeal.commission || 0) - Number(dbDeal.dealValue) * 0.13, // Estimate
    netProfit: Number(dbDeal.commission || 0) - (Number(dbDeal.dealValue) - Number(dbDeal.commission || 0) - Number(dbDeal.dealValue) * 0.13)
  };
}

// Database realtor type
interface DbRealtor {
  id: string;
  level: number;
  hireDate: string | Date;
  trainingProgress?: Array<{ lectureCompleted?: boolean; videoCompleted?: boolean; practicalCompleted?: boolean }>;
  deals?: DbDeal[];
  user: {
    fullName: string;
    email: string;
  };
}

// Transform database realtor to frontend Agent
function transformAgent(dbRealtor: DbRealtor): Agent {
  const level = levelMap[dbRealtor.level] || 'Чирак';
  
  // Get training progress
  const trainingProgress = dbRealtor.trainingProgress || [];
  const completedStages = trainingProgress.filter((tp: { lectureCompleted?: boolean; videoCompleted?: boolean; practicalCompleted?: boolean }) => 
    tp.lectureCompleted && tp.videoCompleted && tp.practicalCompleted
  ).length;
  const trainingStage = Math.min(completedStages + 1, 5) as 1 | 2 | 3 | 4 | 5;

  // Transform deals
  const deals = (dbRealtor.deals || []).map(transformDeal);

  // Generate avatar URL from name
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dbRealtor.user.fullName)}`;

  // Create level history from deals and level
  const levelHistory = [];
  if (deals.length > 0) {
    const firstDeal = deals[0];
    levelHistory.push({
      level: 'Чирак' as const,
      date: dbRealtor.hireDate,
      achievements: ['Завършено основно обучение', 'Първа успешна сделка']
    });
  }
  if (level !== 'Чирак' && deals.length >= 5) {
    levelHistory.push({
      level: 'Реализатор' as const,
      date: deals[Math.floor(deals.length / 2)]?.date || dbRealtor.hireDate,
      achievements: ['Надминати тримесечни цели', `${deals.length} успешни сделки`]
    });
  }
  if (level === 'Елит') {
    levelHistory.push({
      level: 'Елит' as const,
      date: deals[deals.length - 1]?.date || dbRealtor.hireDate,
      achievements: ['Ментор на екип', 'Най-високи приходи за тримесечие']
    });
  }

  // Generate skills based on level and performance
  const baseSkills = [
    { name: 'Продажби', level: Math.min(50 + dbRealtor.level * 10 + deals.length * 5, 100) },
    { name: 'Преговори', level: Math.min(45 + dbRealtor.level * 12 + deals.length * 4, 100) },
    { name: 'Маркетинг', level: Math.min(40 + dbRealtor.level * 8 + deals.length * 3, 100) },
    { name: 'Работа с клиенти', level: Math.min(50 + dbRealtor.level * 10 + deals.length * 5, 100) },
    { name: 'Документация', level: Math.min(45 + dbRealtor.level * 9 + deals.length * 4, 100) }
  ];

  return {
    id: dbRealtor.id,
    name: formatNameWithoutElevenEleven(dbRealtor.user.fullName).displayName,
    position: 'Реализатор',
    avatar,
    level,
    trainingStage,
    dateOfHiring: new Date(dbRealtor.hireDate).toISOString().split('T')[0],
    email: dbRealtor.user.email,
    phone: '+359 888 000 000', // Default, can be added to profile later
    department: 'Централен офис',
    skills: baseSkills,
    deals,
    levelHistory
  };
}

// Database team type
interface DbTeam {
  id: string;
  leader?: {
    fullName: string;
    realtor?: unknown;
  };
  realtors?: DbRealtor[];
}

// Transform database team to frontend TeamLeader
function transformTeamLeader(dbTeam: DbTeam): TeamLeader | null {
  if (!dbTeam.leader) return null;

  const leader = dbTeam.leader;
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(leader.fullName)}`;

  // Get team members (realtors)
  const teamMembers = (dbTeam.realtors || []).map(transformAgent);

  return {
    id: dbTeam.id,
    name: formatNameWithoutElevenEleven(leader.fullName).displayName,
    position: leader.realtor ? 'Регионален мениджър' : 'Ръководител',
    avatar,
    teamMembers
  };
}

// Database office type
interface DbOffice {
  id: string;
  name: string;
  address?: string;
  teams?: DbTeam[];
}

// Transform database office to frontend Office
export function transformOffice(dbOffice: DbOffice): Office {
  const teamLeaders = (dbOffice.teams || [])
    .map(transformTeamLeader)
    .filter((tl: TeamLeader | null): tl is TeamLeader => tl !== null);

  return {
    id: dbOffice.id,
    name: dbOffice.name,
    location: dbOffice.address || dbOffice.name,
    teamLeaders
  };
}

// Transform array of offices
export function transformOffices(dbOffices: DbOffice[]): Office[] {
  return dbOffices.map(transformOffice);
}

