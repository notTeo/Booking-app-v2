import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomers, type Customer } from '../api/customer.api';
import { handleActivateKeyDown } from '../utils/a11y';
import '../styles/pages/team.css';

const PAGE_SIZE = 20;

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
  }, [shop?.id, search, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (shopLoading) {
    return (
      <div className="team-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="team-header">
        <h1>{t.customers.title}</h1>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label htmlFor="customer-search" className="visually-hidden">
          {t.customers.searchPlaceholder}
        </label>
        <input
          id="customer-search"
          type="text"
          placeholder={t.customers.searchPlaceholder}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      ) : customers.length === 0 ? (
        <p className="team-empty">
          {search ? t.customers.noResults : t.customers.noCustomers}
        </p>
      ) : (
        <>
          {/* Desktop / tablet: table (hidden below 640px) */}
          <div className="data-table-card table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.customers.nameCol}</th>
                  <th>{t.customers.phoneCol}</th>
                  <th>{t.customers.emailCol}</th>
                  <th>{t.customers.addedCol}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="data-table-row data-table-row--clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(c.id)}
                    onKeyDown={handleActivateKeyDown(() => navigate(c.id))}
                  >
                    <td>{c.contactHidden ? t.customers.hiddenLabel : c.name}</td>
                    <td>{c.contactHidden ? '—' : c.phone}</td>
                    <td className="team-date">{c.contactHidden ? '—' : c.email ?? '—'}</td>
                    <td className="team-date">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards (hidden at 640px and above) */}
          <div className="row-cards card-view">
            {customers.map((c) => (
              <div
                key={c.id}
                className="row-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(c.id)}
                onKeyDown={handleActivateKeyDown(() => navigate(c.id))}
              >
                <div className="row-card__field">
                  <span className="row-card__label">{t.customers.nameCol}</span>
                  <span className="row-card__value">{c.contactHidden ? t.customers.hiddenLabel : c.name}</span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.customers.phoneCol}</span>
                  <span className="row-card__value">{c.contactHidden ? '—' : c.phone}</span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.customers.emailCol}</span>
                  <span className="row-card__value">{c.contactHidden ? '—' : c.email ?? '—'}</span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.customers.addedCol}</span>
                  <span className="row-card__value">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination-controls">
            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t.customers.prevPage}
            </button>
            <span className="pagination-status">
              {t.customers.pageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}
            </span>
            <button
              className="btn btn-ghost"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t.customers.nextPage}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
