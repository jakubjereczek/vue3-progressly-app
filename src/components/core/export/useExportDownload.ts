import type { EnrichedActivity } from './useExportData';
import { localDateToString } from '@/utils/time';

export type ExportFormat = 'csv' | 'json' | 'xlsx';
export type CsvSeparator = 'comma' | 'semicolon' | 'tab';
export type CsvEncoding = 'utf8-bom' | 'utf8';
export type JsonStructure = 'flat' | 'nested';

export interface CsvOptions {
  separator: CsvSeparator;
  encoding: CsvEncoding;
}

export interface JsonOptions {
  structure: JsonStructure;
}

const SEPARATOR_CHAR: Record<CsvSeparator, string> = {
  comma: ',',
  semicolon: ';',
  tab: '\t',
};

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

function escapeCsvValue(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateCsv(rows: EnrichedActivity[], options: CsvOptions): string {
  const sep = SEPARATOR_CHAR[options.separator];
  const escape = (v: string) => escapeCsvValue(v, sep);

  const lines = [CSV_HEADERS.map(escape).join(sep)];
  for (const row of rows) {
    const date = localDateToString(new Date(row.started_at));
    lines.push(
      [
        escape(date),
        escape(row.description),
        escape(row.categoryName),
        escape(row.tags.join(', ')),
        escape(row.started_at),
        escape(row.finished_at),
        escape(row.durationFormatted),
        String(Math.floor(row.durationSeconds)),
      ].join(sep),
    );
  }

  const content = lines.join('\n');
  return options.encoding === 'utf8-bom' ? '\uFEFF' + content : content;
}

function generateJson(rows: EnrichedActivity[], options?: JsonOptions): string {
  if (options?.structure === 'nested') {
    const grouped: Record<
      string,
      Record<
        string,
        Array<{
          description: string;
          tags: string[];
          started_at: string;
          finished_at: string;
          duration_seconds: number;
          duration: string;
        }>
      >
    > = {};
    for (const row of rows) {
      const date = localDateToString(new Date(row.started_at));
      const cat = row.categoryName || 'Uncategorized';
      if (!grouped[date]) grouped[date] = {};
      if (!grouped[date]![cat]) grouped[date]![cat] = [];
      grouped[date]![cat]!.push({
        description: row.description,
        tags: row.tags,
        started_at: row.started_at,
        finished_at: row.finished_at,
        duration_seconds: Math.floor(row.durationSeconds),
        duration: row.durationFormatted,
      });
    }
    const nested = Object.entries(grouped).map(([date, cats]) => ({
      date,
      categories: Object.entries(cats).map(([category, activities]) => ({ category, activities })),
    }));
    return JSON.stringify(nested, null, 2);
  }

  const data = rows.map((row) => ({
    date: localDateToString(new Date(row.started_at)),
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

function generateXls(rows: EnrichedActivity[]): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const headers = [
    'Date',
    'Description',
    'Category',
    'Tags',
    'Started At',
    'Finished At',
    'Duration',
    'Duration (seconds)',
  ];
  const headerRow = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const dataRows = rows
    .map((row) => {
      const cells = [
        localDateToString(new Date(row.started_at)),
        row.description,
        row.categoryName,
        row.tags.join(', '),
        row.started_at,
        row.finished_at,
        row.durationFormatted,
        String(Math.floor(row.durationSeconds)),
      ]
        .map((v) => `<td>${esc(v)}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Activities</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<meta charset="UTF-8" /></head>
<body><table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table></body>
</html>`;
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
  function download(
    rows: EnrichedActivity[],
    format: ExportFormat,
    csvOptions?: CsvOptions,
    jsonOptions?: JsonOptions,
  ) {
    const date = localDateToString(new Date());
    if (format === 'csv') {
      const options: CsvOptions = csvOptions ?? { separator: 'comma', encoding: 'utf8-bom' };
      triggerDownload(generateCsv(rows, options), `progressly-export-${date}.csv`, 'text/csv;charset=utf-8;');
    } else if (format === 'json') {
      triggerDownload(
        generateJson(rows, jsonOptions),
        `progressly-export-${date}.json`,
        'application/json;charset=utf-8;',
      );
    } else if (format === 'xlsx') {
      triggerDownload(generateXls(rows), `progressly-export-${date}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
    }
  }

  return { download };
}
