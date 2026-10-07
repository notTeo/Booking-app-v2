import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleRowClick } from '../utils/a11y';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { exportAllCustomers, getCustomers, type Customer } from '../api/customer.api';
import { buildExport, downloadBlob } from '../utils/customerFiles';
import { canManageShop } from '../utils/roles';
import ImportCustomersModal from '../components/ImportCustomersModal';
import CustomerFormModal from '../components/CustomerFormModal';
import Avatar from '../components/Avatar';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faPlus, faUserPen } from '@fortawesome/free-solid-svg-icons';

const PAGE_SIZE = 20;
// How long typing must pause before the search is sent.
const SEARCH_DELAY_MS = 250;

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
  // The search the list was last asked for; trails the input while typing.
  const [query, setQuery] = useState('');
  // False until the first list arrives. After that a refresh keeps the old
  // rows on screen instead of swapping the whole list for a spinner.
  const [loaded, setLoaded] = useState(false);
  const [onlyCustomDurations, setOnlyCustomDurations] = useState(false);
  // Customers whose own changes (from the sign-up page) wait for approval.
  const [onlyPending, setOnlyPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    // A slower, older answer must not overwrite a newer one.
    let stale = false;
    getCustomers(shop.id, query || undefined, page, PAGE_SIZE, onlyCustomDurations, onlyPending)
      .then((result) => {
        if (stale) return;
        setPendingCount(result.pendingChangesCount ?? 0);
        setCustomers(result.items);
        setTotal(result.total);
        setLoaded(true);
      })
      .catch(() => { if (!stale) setError(t.customers.errorLoad); })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [shop?.id, query, page, onlyCustomDurations, onlyPending, reloadKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const handleExport = async () => {
    if (!shop || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const blob = await buildExport('xlsx', await exportAllCustomers(shop.id));
      downloadBlob(blob, `customers-${shop.slug}.xlsx`);
    } catch {
      setExportError(t.customers.exportAllError);
    } finally {
      setExporting(false);
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
        <div className="cluster cluster--tight">
          {/* Anyone who may see customer details can add one; the API enforces it too. */}
          {shop?.canViewCustomerDetails !== false && (
            <button className="btn btn--sm" onClick={() => setCreateOpen(true)}>
              <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
              {t.customerProfile.newCustomer}
            </button>
          )}
          {/* Owner and managers; the API enforces it too. */}
          {canManageShop(shop?.role) && (
            <>
              <button className="btn btn--secondary btn--sm" onClick={() => setImportOpen(true)}>
                {t.customers.importButton}
              </button>
              <button
                className={`btn btn--secondary btn--sm${exporting ? ' is-loading' : ''}`}
                onClick={handleExport}
                aria-busy={exporting}
              >
                {t.customers.exportLabel}
              </button>
            </>
          )}
        </div>
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="cluster cluster--tight">
        <button
          type="button"
          className="chip"
          aria-pressed={onlyCustomDurations}
          onClick={() => { setOnlyCustomDurations((v) => !v); setPage(1); }}
        >
          <FontAwesomeIcon icon={faClock} aria-hidden="true" />
          <span className="chip__label">{t.customers.filterCustomDurations}</span>
        </button>
        {(pendingCount > 0 || onlyPending) && (
          <button
            type="button"
            className="chip"
            aria-pressed={onlyPending}
            onClick={() => { setOnlyPending((v) => !v); setPage(1); }}
          >
            <FontAwesomeIcon icon={faUserPen} aria-hidden="true" />
            <span className="chip__label">{t.customerProfile.changesFilter} ({pendingCount})</span>
          </button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* The keys keep React from reusing the spinner's elements for the list.
          Reused, iOS left the spinner's rotation running on the customer cards. */}
      {loading && !loaded ? (
        <div key="loading" className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      ) : (
        <div key="list" className="table-wrap" aria-busy={loading}>
          <div className="table-surface">
            {customers.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">
                  {query || onlyCustomDurations || onlyPending ? t.customers.noResults : t.customers.noCustomers}
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
                        <span className="cluster cluster--tight">
                          {!c.contactHidden && <Avatar name={c.name} photoUrl={c.photoUrl} size="sm" />}
                          <Link to={c.id} className="data-table__link">
                            {c.contactHidden ? t.customers.hiddenLabel : c.name}
                          </Link>
                          {c.hasPendingChanges && (
                            <span className="badge badge--warning">
                              <FontAwesomeIcon icon={faUserPen} aria-hidden="true" />
                              {t.customerProfile.changesBadge}
                            </span>
                          )}
                          {c.hasCustomDurations && (
                            <span className="badge badge--info">
                              <FontAwesomeIcon icon={faClock} aria-hidden="true" />
                              {t.customers.customDurationsBadge}
                            </span>
                          )}
                        </span>
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
      {createOpen && shop && (
        <CustomerFormModal
          shopId={shop.id}
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => navigate(created.id)}
        />
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
