// Data export utilities

export interface ExportOptions {
  filename?: string;
  format?: 'csv' | 'json';
}

export function exportToCSV(data: Record<string, unknown>[], filename: string = 'export.csv') {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(data: Record<string, unknown>[], filename: string = 'export.json') {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportKPIData(kpiData: Record<string, unknown>, filename: string = 'kpi-data') {
  const data = [
    {
      'Метрика': 'Диагнози',
      'Стойност': kpiData.diagnoses || 0,
    },
    {
      'Метрика': 'Сделки',
      'Стойност': kpiData.deals || 0,
    },
    {
      'Метрика': 'Успеваемост',
      'Стойност': `${kpiData.successRate || 0}%`,
    },
    {
      'Метрика': 'Реализатори',
      'Стойност': kpiData.realtors || 0,
    },
  ];

  exportToCSV(data, `${filename}.csv`);
}

export function exportTrainingProgress(progress: Record<string, unknown>[], filename: string = 'training-progress') {
  const data = progress.map(p => ({
    'Раздел': p.section,
    'Подраздел': p.subsection,
    'Лекция': p.lecture_completed ? 'Да' : 'Не',
    'Видео': p.video_completed ? 'Да' : 'Не',
    'Практика': p.practical_completed ? 'Да' : 'Не',
    'Предаване': p.handover_completed ? 'Да' : 'Не',
    'Изпит': p.exam_completed ? 'Да' : 'Не',
  }));

  exportToCSV(data, `${filename}.csv`);
}

export function exportDeals(deals: Record<string, unknown>[], filename: string = 'deals') {
  const data = deals.map(d => ({
    'Клиент': d.clientName || d.client_name,
    'Стойност': d.dealValue || d.deal_value,
    'Дата': d.dealDate || d.deal_date,
    'Ключ': d.isKey || d.is_key ? 'Да' : 'Не',
    'Ексклузив': d.isExclusive || d.is_exclusive ? 'Да' : 'Не',
  }));

  exportToCSV(data, `${filename}.csv`);
}

export function exportDiagnoses(diagnoses: Record<string, unknown>[], filename: string = 'diagnoses') {
  const data = diagnoses.map(d => ({
    'Клиент': d.clientName || d.client_name,
    'Дата': d.diagnosisDate || d.diagnosis_date,
    'Статус': d.status,
    'Бележки': d.notes || '',
  }));

  exportToCSV(data, `${filename}.csv`);
}

