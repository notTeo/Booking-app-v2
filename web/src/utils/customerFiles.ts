import Papa from 'papaparse';
import type { CustomerExportRow, ImportRow } from '../api/customer.api';

export type ExportFormat = 'csv' | 'xlsx' | 'json';

// Byte-order mark: Excel needs it to read a UTF-8 CSV; a file may start with one.
const BOM = String.fromCharCode(0xfeff);

const EXPORT_COLUMNS = ['name', 'phone', 'email', 'notes', 'createdAt', 'bookings'] as const;

// A spreadsheet runs a cell that starts with = + - or @ as a formula, and a
// customer's name comes from a public form. Such text gets a leading
// apostrophe on the way out (the spreadsheet then shows it as plain text) and
// loses it again on the way in. Phones are left alone: they are validated to
// digits and separators, and "+30…" must survive a round trip.
const FORMULA_START = /^[=+\-@\t\r]/;
const guard = (value: string | null) => (value && FORMULA_START.test(value) ? `'${value}` : value ?? '');
const unguard = (value: string) => (/^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value);

const exportRecord = (c: CustomerExportRow) => ({
  name: guard(c.name),
  phone: c.phone,
  email: guard(c.email),
  notes: guard(c.notes),
  createdAt: c.createdAt.slice(0, 10),
  bookings: c.bookings,
});

/** CSV text, with a byte-order mark so Excel reads Greek correctly. */
export const toCsv = (customers: CustomerExportRow[]) =>
  BOM + Papa.unparse({ fields: [...EXPORT_COLUMNS], data: customers.map(exportRecord) });

async function toXlsx(customers: CustomerExportRow[]) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.columns = EXPORT_COLUMNS.map((key) => ({ header: key, key, width: key === 'notes' ? 40 : 22 }));
  // Cells are written as text, never as formulas, so no guard is needed here.
  customers.forEach((c) => sheet.addRow({ ...c, email: c.email ?? '', notes: c.notes ?? '', createdAt: c.createdAt.slice(0, 10) }));
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

/** The customers as a file of the given format. */
export async function buildExport(format: ExportFormat, customers: CustomerExportRow[]): Promise<Blob> {
  if (format === 'csv') return new Blob([toCsv(customers)], { type: 'text/csv;charset=utf-8' });
  if (format === 'json') return new Blob([JSON.stringify(customers, null, 2)], { type: 'application/json' });
  return new Blob([await toXlsx(customers)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ───────────────────────────────────────────────────────────────────

type Field = 'name' | 'phone' | 'email' | 'notes';

// Column headings a file may use, compared without case or accents.
const ALIASES: Record<Field, string[]> = {
  name: ['name', 'full name', 'customer', 'ονομα', 'ονοματεπωνυμο', 'πελατης'],
  phone: ['phone', 'mobile', 'tel', 'telephone', 'τηλεφωνο', 'κινητο'],
  email: ['email', 'e-mail', 'mail'],
  notes: ['notes', 'note', 'comments', 'σημειωσεις', 'σχολια'],
};

const normalise = (heading: string) =>
  heading.replace(BOM, '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

export interface ParsedCustomers {
  rows: ImportRow[];
  /** Required columns the file does not have; when not empty, `rows` is empty. */
  missing: ('name' | 'phone')[];
}

/** Turn a table (first row = headings) into import rows. Blank lines are dropped. */
export function mapTable(table: string[][]): ParsedCustomers {
  const [headings = [], ...lines] = table;
  const column = {} as Partial<Record<Field, number>>;
  headings.forEach((heading, index) => {
    const field = (Object.keys(ALIASES) as Field[]).find((f) => ALIASES[f].includes(normalise(String(heading ?? ''))));
    if (field && column[field] === undefined) column[field] = index;
  });

  const missing = (['name', 'phone'] as const).filter((f) => column[f] === undefined);
  if (missing.length) return { rows: [], missing };

  const cell = (line: string[], field: Field) =>
    column[field] === undefined ? '' : String(line[column[field]] ?? '').trim();

  const rows = lines
    .map((line) => ({
      name: unguard(cell(line, 'name')),
      phone: cell(line, 'phone'),
      email: unguard(cell(line, 'email')),
      notes: unguard(cell(line, 'notes')),
    }))
    .filter((r) => r.name || r.phone || r.email || r.notes);
  return { rows, missing: [] };
}

/** Parse CSV text; the delimiter (comma, semicolon, tab) is detected. */
export const parseCsv = (text: string) =>
  mapTable(Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' }).data);

async function parseXlsx(data: ArrayBuffer) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  await workbook.xlsx.load(data);
  const table: string[][] = [];
  workbook.worksheets[0]?.eachRow({ includeEmpty: false }, (row) => {
    const line: string[] = [];
    row.eachCell({ includeEmpty: true }, (c, col) => { line[col - 1] = c.text; });
    table.push(Array.from(line, (v) => v ?? ''));
  });
  return mapTable(table);
}

function parseJson(text: string) {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('not a list');
  const headings = [...new Set(data.flatMap((item) => Object.keys(item ?? {})))];
  return mapTable([headings, ...data.map((item) => headings.map((h) => String(item?.[h] ?? '')))]);
}

export class UnsupportedFileError extends Error {}

/** Read a .csv, .xlsx or .json file of customers. Throws UnsupportedFileError for anything else. */
export async function readCustomerFile(file: File): Promise<ParsedCustomers> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) return parseCsv(await file.text());
  if (name.endsWith('.xlsx')) return parseXlsx(await file.arrayBuffer());
  if (name.endsWith('.json')) return parseJson(await file.text());
  throw new UnsupportedFileError(file.name);
}
