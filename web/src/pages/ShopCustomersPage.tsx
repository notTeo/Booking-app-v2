import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomers, type Customer } from '../api/customer.api';
import '../styles/pages/team.css';

export default function ShopCustomersPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const navigate = useNavigate();
  const { t } = useLang();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    setError('');
    getCustomers(shop.id, search || undefined)
      .then(setCustomers)
      .catch(() => setError(t.customers.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id, search]);

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
        <input
          type="text"
          placeholder={t.customers.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <div className="team-table-card">
          <table className="team-table">
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
                  className="team-table-row"
                  onClick={() => navigate(c.id)}
                >
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td className="team-date">{c.email ?? '—'}</td>
                  <td className="team-date">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
