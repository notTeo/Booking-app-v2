import { useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { IMPORT_BATCH_SIZE, importCustomers, type ImportResult, type ImportRow } from '../api/customer.api';
import { readCustomerFile, UnsupportedFileError } from '../utils/customerFiles';
import Alert from './Alert';
import Modal from './Modal';

interface Props {
  shopId: string;
  /** Called once customers were created or updated, so the list can reload. */
  onImported: () => void;
  onClose: () => void;
}

const PREVIEW_ROWS = 5;
const SHOWN_ERRORS = 20;

// Import customers from a CSV, Excel or JSON file: pick the file, check the
// first rows, import. Existing customers (same phone) only get their empty
// fields filled. The file is read in the browser and sent in batches.
export default function ImportCustomersModal({ shopId, onImported, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();

  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = async (file: File | undefined) => {
    setRows(null);
    setFileError('');
    setError('');
    if (!file) return;
    try {
      const parsed = await readCustomerFile(file);
      if (parsed.missing.length) {
        const columns = parsed.missing.map((c) => (c === 'name' ? t.customers.nameCol : t.customers.phoneCol)).join(', ');
        setFileError(t.customers.importMissingColumns.replace('{columns}', columns));
      } else if (parsed.rows.length === 0) {
        setFileError(t.customers.importEmpty);
      } else {
        setRows(parsed.rows);
      }
    } catch (err) {
      setFileError(err instanceof UnsupportedFileError ? t.customers.importUnsupported : t.customers.importUnreadable);
    }
  };

  const handleImport = async () => {
    if (!rows || importing) return;
    setImporting(true);
    setError('');
    const total: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    try {
      for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
        const batch = await importCustomers(shopId, rows.slice(start, start + IMPORT_BATCH_SIZE));
        total.created += batch.created;
        total.updated += batch.updated;
        total.skipped += batch.skipped;
        total.errors.push(...batch.errors.map((e) => ({ ...e, row: e.row + start })));
      }
      setResult(total);
    } catch {
      // Earlier batches are already saved; say so rather than pretend nothing happened.
      setError(
        total.created + total.updated > 0
          ? t.customers.importPartialError.replace('{count}', String(total.created + total.updated))
          : t.customers.importError,
      );
    } finally {
      setImporting(false);
      if (total.created + total.updated > 0) onImported();
    }
  };

  return (
    <Modal onClose={() => { if (!importing) onClose(); }} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{t.customers.importTitle}</h2>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onClose}
          disabled={importing}
          aria-label={t.customers.cancel}
        >
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {error && <Alert variant="danger">{error}</Alert>}
        {result ? (
          <>
            <Alert variant="success">
              {t.customers.importResult
                .replace('{created}', String(result.created))
                .replace('{updated}', String(result.updated))
                .replace('{skipped}', String(result.skipped))}
            </Alert>
            {result.errors.length > 0 && (
              <>
                <p className="t-body-sm">{t.customers.importRowErrors.replace('{count}', String(result.errors.length))}</p>
                <ul className="list">
                  {result.errors.slice(0, SHOWN_ERRORS).map((e) => (
                    <li key={e.row} className="list__item t-body-sm">
                      {/* +2: rows count from 1 and the first line of the file is the headings */}
                      {t.customers.importRowError.replace('{row}', String(e.row + 2))}: {t.customers.importProblems[e.reason]}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <>
            <p className="t-body-sm t-muted">{t.customers.importHint}</p>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-file`}>{t.customers.importFileLabel}</label>
              <input
                id={`${uid}-file`}
                className="input"
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={importing}
              />
            </div>
            {fileError && <Alert variant="danger">{fileError}</Alert>}
            {rows && (
              <>
                <p className="t-body-sm">{t.customers.importPreview.replace('{count}', String(rows.length))}</p>
                <div className="table-wrap">
                  <div className="table-surface">
                    <table className="data-table" role="table">
                      <thead>
                        <tr role="row">
                          <th scope="col" role="columnheader">{t.customers.nameCol}</th>
                          <th scope="col" role="columnheader">{t.customers.phoneCol}</th>
                          <th scope="col" role="columnheader">{t.customers.emailCol}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                          <tr key={i} role="row">
                            <td role="cell" data-label={t.customers.nameCol} className="data-table__title">{r.name || '—'}</td>
                            <td role="cell" data-label={t.customers.phoneCol}>{r.phone || '—'}</td>
                            <td role="cell" data-label={t.customers.emailCol}>{r.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={importing}>
          {result ? t.customers.importClose : t.customers.cancel}
        </button>
        {!result && (
          <button
            type="button"
            className={`btn${importing ? ' is-loading' : ''}`}
            onClick={handleImport}
            aria-busy={importing}
            disabled={!rows}
          >
            {t.customers.importConfirmButton}
          </button>
        )}
      </div>
    </Modal>
  );
}
