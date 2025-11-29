import { TrainingGroup } from '@/types';
import { mockOffices } from './mockData';

// Вземи някои агенти за обучение
const allAgents = mockOffices[0].teamLeaders.flatMap(tl => tl.teamMembers);

export const mockTrainingGroups: TrainingGroup[] = [
  {
    id: 'tg1',
    startDate: '2024-03-18',
    leader: 'Краси Кътев',
    leaderId: 'tl1',
    currentDay: 2,
    status: 'активна',
    trainees: [allAgents[0]].filter(Boolean),
  },
  {
    id: 'tg2',
    startDate: '2024-03-14',
    leader: 'Лазар Бундев',
    leaderId: 'tl2',
    currentDay: 3,
    status: 'активна',
    trainees: [allAgents[1]].filter(Boolean),
  },
  {
    id: 'tg3',
    startDate: '2024-03-04',
    leader: 'Георги Пенев',
    leaderId: 'tl3',
    currentDay: 3,
    status: 'завършена',
    trainees: [allAgents[0]].filter(Boolean),
  },
];
