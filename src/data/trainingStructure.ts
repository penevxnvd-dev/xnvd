// Пълна структура на обучението според описанието

export interface TrainingSection {
  id: string;
  title: string;
  subsections: TrainingSubsection[];
}

export interface TrainingSubsection {
  id: string;
  title: string;
  progress: {
    lecture: boolean;
    video: boolean;
    practical: boolean;
    handover: boolean;
    exam: boolean;
  };
}

export const trainingStructure: TrainingSection[] = [
  {
    id: 'work-with-buyer',
    title: 'Работа с купувач',
    subsections: [
      {
        id: 'diagnosis',
        title: 'Диагноза',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'list-maintenance',
        title: 'Поддръжка на списък с купувачи',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'buyer-transfer',
        title: 'Прехвърляне на купувач от друг списък',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'motivation-space',
        title: 'Мотивиране чрез свободно пространство',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
    ],
  },
  {
    id: 'view-organization',
    title: 'Организация на огледи',
    subsections: [
      {
        id: 'search-filter',
        title: 'Филтър на търсене',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'property-selection',
        title: 'Подбор на подходящи имоти',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'listening',
        title: 'Прослушване на подходящи имоти',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'strategy-selection',
        title: 'Избор на стратегия',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
    ],
  },
  {
    id: 'translator-conversation',
    title: 'Разговор продавач',
    subsections: [
      {
        id: 'main-script',
        title: 'Основен скрипт',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'conversation-during-view',
        title: 'Разговор по време на оглед',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'price-conversation',
        title: 'Разговор за цена',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'commission-conversation',
        title: 'Разговор за комисионна',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
    ],
  },
  {
    id: 'conducting-views',
    title: 'Провеждане на огледи',
    subsections: [
      {
        id: 'introduction',
        title: 'Запознанство (преди първи оглед)',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'behavior-during-view',
        title: 'Действия и поведение по време на оглед',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'document-work',
        title: 'Работа с документи',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'closing',
        title: 'Затваряне и продължение след огледа',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
      {
        id: 'sales-principles',
        title: 'Основни търговски принципи',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
      },
    ],
  },
];

// Функция за изчисляване на общ прогрес
export const calculateTrainingProgress = (structure: TrainingSection[]): number => {
  let totalRows = 0;
  let completedRows = 0;

  structure.forEach((section) => {
    section.subsections.forEach((subsection) => {
      totalRows++;
      const { lecture, video, practical, handover, exam } = subsection.progress;
      if (lecture && video && practical && handover && exam) {
        completedRows++;
      }
    });
  });

  return totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0;
};

// Функция за проверка дали ред е завършен
export const isRowCompleted = (progress: TrainingSubsection['progress']): boolean => {
  return (
    progress.lecture &&
    progress.video &&
    progress.practical &&
    progress.handover &&
    progress.exam
  );
};

