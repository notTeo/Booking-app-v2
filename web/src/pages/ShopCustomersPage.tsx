import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleRowClick } from '../utils/a11y';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { exportAllCustomers, getCustomers, type Customer } from '../api/customer.api';
import { buildExport, downloadBlob, type ExportFormat } from '../utils/customerFiles';
import { canManageShop } from '../utils/roles';
import ImportCustomersModal from '../components/ImportCustomersModal';
import '../styles/pages/team.css';
import Alert from '../components/Alert';

const PAGE_SIZE = 20;

const EXPORT_FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'xlsx', label: 'Excel' },
  { format: 'json', label: 'JSON' },
];

export default function ShopCustomersPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const navigate = useNavigate();
  const { t } = useLang();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState('');
  // Bumped after an import so the list loads again.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    setError('');
    // search is applied server-side against every customer in the shop
    // before pagination, so it always searches the full list, not just
    // whatever page happens to be loaded.
    getCustomers(shop.id, search || undefined, page, PAGE_SIZE)
      .then((result) => {
        setCustomers(result.items);
        setTotal(result.total);
      })
      .catch(() => setError(t.customers.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id, search, page, reloadKey]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleExport = async (format: ExportFormat) => {
    if (!shop || exporting) return;
    setExporting(format);
    setExportError('');
    try {
      const blob = await buildExport(format, await exportAllCustomers(shop.id));
      downloadBlob(blob, `customers-${shop.slug}.${format}`);
    } catch {
      setExportError(t.customers.exportAllError);
    } finally {
      setExporting(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (shopLoading) {
    return (
      <div className="team-page">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="page-header">
        <h1 className="t-title">{t.customers.title}</h1>
        {/* Owner and managers; the API enforces it too. */}
        {canManageShop(shop?.role) && (
          <div className="cluster cluster--tight">
            <button className="btn btn--sm" onClick={() => setImportOpen(true)}>
              {t.customers.importButton}
            </button>
            <span className="t-body-sm t-muted" id="customers-export-label">{t.customers.exportLabel}</span>
            <div className="cluster cluster--tight" role="group" aria-labelledby="customers-export-label">
              {EXPORT_FORMATS.map(({ format, label }) => (
                <button
                  key={format}
                  className={`btn btn--secondary btn--sm${exporting === format ? ' is-loading' : ''}`}
                  onClick={() => handleExport(format)}
                  aria-busy={exporting === format}
                  disabled={exporting !== null && exporting !== format}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {exportError && <Alert variant="danger">{exportError}</Alert>}

      {/* Search matches names and phones, so it is only offered to members who may see them. */}
      {shop?.canViewCustomerDetails !== false && (
        <div className="field">
          <label htmlFor="customer-search" className="visually-hidden">
            {t.customers.searchPlaceholder}
          </label>
          <input className="input"
            id="customer-search"
            type="text"
            placeholder={t.customers.searchPlaceholder}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-surface">
            {customers.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">
                  {search ? t.customers.noResults : t.customers.noCustomers}
                </p>
              </div>
            ) : (
              <table className="data-table" role="table">
                <thead>
                  <tr role="row">
                    <th scope="col" role="columnheader">{t.customers.nameCol}</th>
                    <th scope="col" role="columnheader">{t.customers.phoneCol}</th>
                    <th scope="col" role="columnheader">{t.customers.emailCol}</th>
                    <th scope="col" role="columnheader">{t.customers.addedCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} role="row" className="is-clickable" onClick={handleRowClick(() => navigate(c.id))}>
                      <td role="cell" data-label={t.customers.nameCol} className="data-table__title">
                        <Link to={c.id} className="data-table__link">
                          {c.contactHidden ? t.customers.hiddenLabel : c.name}
                        </Link>
                      </td>
                      <td role="cell" data-label={t.customers.phoneCol}>{c.contactHidden ? '—' : c.phone}</td>
                      <td role="cell" data-label={t.customers.emailCol}>{c.contactHidden ? '—' : c.email ?? '—'}</td>
                      <td role="cell" data-label={t.customers.addedCol}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {customers.length > 0 && (
              <div className="data-table__foot">
                <span>
                  {t.customers.pageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}
                </span>
                <div className="cluster cluster--tight">
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    {t.customers.prevPage}
                  </button>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    {t.customers.nextPage}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      )}
      {importOpen && shop && (
        <ImportCustomersModal
          shopId={shop.id}
          onClose={() => setImportOpen(false)}
          onImported={() => { setPage(1); setReloadKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}
