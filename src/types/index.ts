export type AgentLevel = 'Чирак' | 'Реализатор' | 'Елит';
export type TrainingStage = 1 | 2 | 3 | 4 | 5;

export interface TrainingDayStage {
  id: string;
  title: string;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  duration: number; // minutes
  description?: string;
}

export interface TrainingDayNotes {
  description?: string; // What was covered in the day
  howItWent?: string; // How the day went
  stages?: TrainingDayStage[]; // Time-tracked stages/tasks
}

export interface TrainingGroup {
  id: string;
  startDate: string;
  leader: string;
  leaderId: string;
  trainees: Agent[];
  currentDay: number; // 1-3
  status: 'активна' | 'завършена' | 'предстояща';
  createdBy?: string | null; // ID of the user who created the group
  dayNotes?: Record<string, TrainingDayNotes>; // Day notes keyed by day number (1, 2, 3)
}

export interface TrainingSchedule {
  day1: 'Встъпително обучение';
  day2: 'Разговор с купувач';
  day3: 'Разговор с продавач и подготовка за изпит';
}

export interface Skill {
  name: string;
  level: number; // 0-100
}

export interface Deal {
  id: string;
  date: string;
  client: string;
  deposit: number;
  dealValue: number;
  expenses?: number;
  netProfit: number;
}

export interface Agent {
  id: string;
  name: string;
  position: string;
  avatar?: string;
  level: AgentLevel;
  trainingStage: TrainingStage;
  dateOfHiring: string;
  email: string;
  phone: string;
  department: string;
  skills: Skill[];
  deals: Deal[];
  levelHistory: {
    level: AgentLevel;
    date: string;
    achievements: string[];
  }[];
  introCompleted?: boolean; // For training group trainees
}

export interface TeamLeader {
  id: string;
  name: string;
  position: string;
  avatar?: string;
  teamMembers: Agent[];
}

export interface Office {
  id: string;
  name: string;
  location: string;
  teamLeaders: TeamLeader[];
}
