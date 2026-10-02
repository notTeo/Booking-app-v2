import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handleRowClick } from '../utils/a11y';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomers, type Customer } from '../api/customer.api';
import '../styles/pages/team.css';
import Alert from '../components/Alert';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-change with a loading flag; move to react-query
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

      {/* Search matches names and phones, so it is only offered to members who may see them. */}
      {shop?.canViewCustomerDetails !== false && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="customer-search" className="visually-hidden">
            {t.customers.searchPlaceholder}
          </label>
          <input className="input"
            id="customer-search"
            type="text"
            placeholder={t.customers.searchPlaceholder}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      ) : (
        <>
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
            </div>
          </div>

          {customers.length > 0 && (
            <div className="pagination-controls">
              <button
                className="bookings-date-nav-btn "
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t.customers.prevPage}
              </button>
              <span className="pagination-status">
                {t.customers.pageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}
              </span>
              <button
                className="bookings-date-nav-btn"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t.customers.nextPage}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
