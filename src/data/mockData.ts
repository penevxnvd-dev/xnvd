import { Office } from '@/types';

export const mockOffices: Office[] = [
  {
    id: '1',
    name: 'Бургас',
    location: 'Хан Крум 6',
    teamLeaders: [
      {
        id: 'tl1',
        name: 'Краси Кътев',
        position: 'Регионален мениджър',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Krasimir',
        teamMembers: [
          {
            id: 'a1',
            name: 'Росен',
            position: 'Реализатор',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rosen',
            level: 'Реализатор',
            trainingStage: 4,
            dateOfHiring: '2021-03-15',
            email: 'rosen@agency.com',
            phone: '+359 888 123 456',
            department: 'Централен офис',
            skills: [
              { name: 'Продажби', level: 85 },
              { name: 'Преговори', level: 90 },
              { name: 'Маркетинг', level: 75 },
              { name: 'Работа с клиенти', level: 88 },
              { name: 'Документация', level: 80 },
            ],
            deals: [
              {
                id: 'd1',
                date: '2024-01-15',
                client: 'Иван Иванов',
                deposit: 50000,
                dealValue: 500000,
                expenses: 15000,
                netProfit: 435000,
              },
              {
                id: 'd2',
                date: '2024-02-20',
                client: 'Елица Георгиева',
                deposit: 75000,
                dealValue: 750000,
                expenses: 20000,
                netProfit: 655000,
              },
            ],
            levelHistory: [
              {
                level: 'Чирак',
                date: '2021-03-15',
                achievements: ['Завършено основно обучение', 'Първа успешна сделка'],
              },
              {
                level: 'Реализатор',
                date: '2022-06-10',
                achievements: ['Надминати тримесечни цели', '10 успешни сделки'],
              },
              {
                level: 'Елит',
                date: '2023-09-05',
                achievements: ['Ментор на екип', 'Най-високи приходи за тримесечие'],
              },
            ],
          },
        ],
      },
      {
        id: 'tl2',
        name: 'Лазар Бундев',
        position: 'Ръководител',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lazar',
        teamMembers: [
          {
            id: 'a2',
            name: 'Руска Тодорова',
            position: 'Реализатор',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ruska',
            level: 'Чирак',
            trainingStage: 2,
            dateOfHiring: '2023-10-10',
            email: 'ruska@agency.com',
            phone: '+359 888 567 890',
            department: 'Централен офис',
            skills: [
              { name: 'Продажби', level: 55 },
              { name: 'Преговори', level: 50 },
              { name: 'Маркетинг', level: 60 },
              { name: 'Работа с клиенти', level: 58 },
              { name: 'Документация', level: 65 },
            ],
            deals: [
              {
                id: 'd4',
                date: '2024-03-05',
                client: 'Лилия Тодорова',
                deposit: 30000,
                dealValue: 300000,
                expenses: 10000,
                netProfit: 260000,
              },
            ],
            levelHistory: [
              {
                level: 'Чирак',
                date: '2023-10-10',
                achievements: ['Завършено обучение', 'Първа среща с клиент'],
              },
            ],
          },
        ],
      },
      {
        id: 'tl3',
        name: 'Георги Пенев',
        position: 'Треньор',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Georgi',
        teamMembers: [],
      },
    ],
  },
];
