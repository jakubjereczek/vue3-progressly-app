import type { EnrichedActivity } from './useExportData';

export type ExportFormat = 'csv' | 'json';

const CSV_HEADERS = [
  'Date',
  'Description',
  'Category',
  'Tags',
  'Started At',
  'Finished At',
  'Duration (HH:MM:SS)',
  'Duration (seconds)',
];

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(rows: EnrichedActivity[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const date = row.started_at.split('T')[0] ?? '';
    lines.push(
      [
        escapeCsvValue(date),
        escapeCsvValue(row.description),
        escapeCsvValue(row.categoryName),
        escapeCsvValue(row.tags.join(', ')),
        escapeCsvValue(row.started_at),
        escapeCsvValue(row.finished_at),
        escapeCsvValue(row.durationFormatted),
        String(Math.floor(row.durationSeconds)),
      ].join(','),
    );
  }
  // BOM prefix for Excel UTF-8 compatibility
  return '\uFEFF' + lines.join('\n');
}

function generateJson(rows: EnrichedActivity[]): string {
  const data = rows.map((row) => ({
    date: row.started_at.split('T')[0],
    description: row.description,
    category: row.categoryName || null,
    tags: row.tags,
    started_at: row.started_at,
    finished_at: row.finished_at,
    duration_seconds: Math.floor(row.durationSeconds),
    duration: row.durationFormatted,
  }));
  return JSON.stringify(data, null, 2);
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportDownload() {
  function download(rows: EnrichedActivity[], format: ExportFormat) {
    const date = new Date().toISOString().split('T')[0];
    if (format === 'csv') {
      triggerDownload(generateCsv(rows), `progressly-export-${date}.csv`, 'text/csv;charset=utf-8;');
    } else {
      triggerDownload(
        generateJson(rows),
        `progressly-export-${date}.json`,
        'application/json;charset=utf-8;',
      );
    }
  }

  return { download };
}
