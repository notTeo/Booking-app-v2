import { describe, it, expect } from 'vitest';
import { buildExport, mapTable, parseCsv, readCustomerFile, toCsv, UnsupportedFileError } from './customerFiles';
import type { CustomerExportRow } from '../api/customer.api';

const customers: CustomerExportRow[] = [
  { name: 'Μαρία, Π.', phone: '+30 691 111 1111', email: 'maria@example.com', notes: 'line one\nline two', createdAt: '2026-03-01T10:00:00.000Z', bookings: 3 },
  { name: '=HYPERLINK("http://evil")', phone: '6900000002', email: null, notes: '@mention', createdAt: '2026-04-02T10:00:00.000Z', bookings: 0 },
];

describe('customer export', () => {
  it('writes CSV with a BOM, quoted commas and date-only createdAt', () => {
    const csv = toCsv(customers);
    expect(csv.startsWith(String.fromCharCode(0xfeff) + 'name,phone,email,notes,createdAt,bookings')).toBe(true);
    expect(csv).toContain('"Μαρία, Π."');
    expect(csv).toContain('2026-03-01,3');
  });

  it('defuses text a spreadsheet would run as a formula, but leaves phones alone', () => {
    const csv = toCsv(customers);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain("'@mention");
    expect(csv).toContain('+30 691 111 1111');
    expect(csv).not.toContain("'+30");
  });

  it('survives a CSV round trip', () => {
    expect(parseCsv(toCsv(customers)).rows).toEqual([
      { name: 'Μαρία, Π.', phone: '+30 691 111 1111', email: 'maria@example.com', notes: 'line one\nline two' },
      { name: '=HYPERLINK("http://evil")', phone: '6900000002', email: '', notes: '@mention' },
    ]);
  });

  it('survives an Excel and a JSON round trip', async () => {
    for (const format of ['xlsx', 'json'] as const) {
      const blob = await buildExport(format, customers);
      const parsed = await readCustomerFile(new File([blob], `customers.${format}`));
      expect(parsed.missing, format).toEqual([]);
      expect(parsed.rows.map((r) => [r.name, r.phone]), format).toEqual([
        ['Μαρία, Π.', '+30 691 111 1111'],
        ['=HYPERLINK("http://evil")', '6900000002'],
      ]);
    }
  });
});

describe('customer import', () => {
  it('finds columns by Greek or English headings in any order, ignoring case and accents', () => {
    const { rows, missing } = mapTable([
      ['Τηλέφωνο', 'EMAIL', 'Όνομα', 'Άσχετο'],
      ['6900000001', 'a@example.com', ' Άννα ', 'x'],
    ]);
    expect(missing).toEqual([]);
    expect(rows).toEqual([{ name: 'Άννα', phone: '6900000001', email: 'a@example.com', notes: '' }]);
  });

  it('reads semicolon-separated CSV and drops blank lines', () => {
    const { rows } = parseCsv('name;phone\nAnna;6900000001\n;\n\nNikos;6900000002\n');
    expect(rows.map((r) => r.name)).toEqual(['Anna', 'Nikos']);
  });

  it('reports a missing required column instead of guessing', () => {
    expect(mapTable([['name', 'email'], ['Anna', 'a@example.com']])).toEqual({ rows: [], missing: ['phone'] });
  });

  it('refuses a file type it cannot read', async () => {
    await expect(readCustomerFile(new File(['x'], 'customers.pdf'))).rejects.toBeInstanceOf(UnsupportedFileError);
  });
});
