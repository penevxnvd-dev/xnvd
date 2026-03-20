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
  // Брой на всяка стъпка
  counts?: {
    lecture: number;
    video: number;
    practical: number;
    handover: number;
  };
  // Тип на практиката (практика с треньор или ролева игра)
  practicalType?: 'practice' | 'roleplay';
}

export const trainingStructure: TrainingSection[] = [
  {
    id: 'work-with-buyer',
    title: 'Диагноза',
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
        counts: {
          lecture: 1,
          video: 3,
          practical: 7,
          handover: 1,
        },
        practicalType: 'practice',
      },
    ],
  },
  {
    id: 'view-organization',
    title: 'Организация на огледи',
    subsections: [
      {
        id: 'filter-placement',
        title: 'Поставяне на филтри',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 3,
          handover: 1,
        },
        practicalType: 'practice',
      },
      {
        id: 'property-selection',
        title: 'Подбор на подходящи',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 3,
          handover: 1,
        },
        practicalType: 'practice',
      },
      {
        id: 'listening',
        title: 'Прослушване на подходящи',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 3,
          handover: 1,
        },
        practicalType: 'practice',
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
        counts: {
          lecture: 1,
          video: 3,
          practical: 3,
          handover: 1,
        },
        practicalType: 'practice',
      },
    ],
  },
  {
    id: 'seller-conversation',
    title: 'Разговор с продавач',
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
        counts: {
          lecture: 1,
          video: 1,
          practical: 12,
          handover: 1,
        },
        practicalType: 'practice',
      },
    ],
  },
  {
    id: 'conducting-views',
    title: 'Провеждане на огледи',
    subsections: [
      {
        id: 'introduction',
        title: 'Запознанство',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 5,
          handover: 1,
        },
        practicalType: 'roleplay',
      },
      {
        id: 'behavior-during-view',
        title: 'Действие и поведение по време на оглед',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 5,
          handover: 1,
        },
        practicalType: 'roleplay',
      },
      {
        id: 'closing',
        title: 'Затваряне на сделка или продължение',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 3,
          practical: 5,
          handover: 1,
        },
        practicalType: 'roleplay',
      },
    ],
  },
  {
    id: 'sales-principles',
    title: 'Основни търговски принципи',
    subsections: [
      {
        id: 'principle-search-focus',
        title: 'Принцип 1 акцент на търсене',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 1,
          video: 1,
          practical: 0,
          handover: 1,
        },
        practicalType: 'practice',
      },
      {
        id: 'funnel-logic',
        title: 'Фуния и логика на сделката',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 2,
          video: 1,
          practical: 0,
          handover: 1,
        },
        practicalType: 'practice',
      },
      {
        id: 'sales-path',
        title: 'Път на продажбата',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 2,
          video: 1,
          practical: 0,
          handover: 1,
        },
        practicalType: 'practice',
      },
      {
        id: 'search-offer',
        title: 'Търсене и предлагане',
        progress: {
          lecture: false,
          video: false,
          practical: false,
          handover: false,
          exam: false,
        },
        counts: {
          lecture: 2,
          video: 1,
          practical: 0,
          handover: 1,
        },
        practicalType: 'practice',
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
      const progress = subsection.progress || { lecture: false, video: false, practical: false, handover: false, exam: false };
      const { lecture, video, practical, handover, exam } = progress;
      if (lecture && video && practical && handover && exam) {
        completedRows++;
      }
    });
  });

  return totalRows > 0 ? Math.round((completedRows / totalRows) * 100) : 0;
};

// Функция за проверка дали обучението е напълно завършено (всички изпити са минати)
export const isTrainingFullyCompleted = (structure: TrainingSection[]): boolean => {
  return structure.every((section) =>
    section.subsections.every((subsection) => subsection.progress?.exam === true)
  );
};

// Функция за проверка дали е завършено вътрешно обучение (първата секция "Работа с купувач")
export const hasCompletedIntroductoryTraining = (structure: TrainingSection[]): boolean => {
  const firstSection = structure.find(section => section.id === 'work-with-buyer');
  if (!firstSection) return false;
  
  // Проверяваме дали всички подсекции в първата секция имат минат изпит
  return firstSection.subsections.every((subsection) => subsection.progress?.exam === true);
};

// Функция за проверка дали ред е завършен
export const isRowCompleted = (progress: TrainingSubsection['progress'] | null | undefined): boolean => {
  if (!progress) return false;
  return (
    progress.lecture &&
    progress.video &&
    progress.practical &&
    progress.handover &&
    progress.exam
  );
};
