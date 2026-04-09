import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomer, updateCustomer, type CustomerDetail } from '../api/customer.api';
import type { BookingStatus } from '../api/booking.api';
import '../styles/pages/team.css';

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string }> = {
  PENDING:   { bg: 'color-mix(in srgb, #d97706 15%, transparent)', color: '#d97706' },
  CONFIRMED: { bg: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' },
  COMPLETED: { bg: 'color-mix(in srgb, #16a34a 15%, transparent)', color: '#16a34a' },
  CANCELED:  { bg: 'var(--bg-input)', color: 'var(--text-muted)' },
  NO_SHOW:   { bg: 'color-mix(in srgb, #e53e3e 12%, transparent)', color: '#e53e3e' },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { bg, color } = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.2rem 0.6rem',
        borderRadius: 999,
        textTransform: 'capitalize',
        letterSpacing: '0.04em',
        display: 'inline-block',
      }}
    >
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

export default function ShopCustomerDetailPage() {
  const { slug, customerId } = useParams<{ slug: string; customerId: string }>();
  const { shop, isLoading: shopLoading } = useShop();
  const navigate = useNavigate();
  const { t } = useLang();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (!shop || !customerId) return;
    setLoading(true);
    getCustomer(shop.id, customerId)
      .then((c) => {
        setCustomer(c);
        setEditName(c.name);
        setEditPhone(c.phone);
        setEditEmail(c.email ?? '');
      })
      .catch(() => setError(t.customers.customerErrorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id, customerId]);

  const handleSave = async () => {
    if (!shop || !customerId) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const updated = await updateCustomer(shop.id, customerId, {
        name: editName,
        phone: editPhone,
        email: editEmail || null,
      });
      setCustomer((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveSuccess(t.customers.successUpdate);
    } catch {
      setSaveError(t.customers.errorUpdate);
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    customer &&
    (editName !== customer.name ||
      editPhone !== customer.phone ||
      editEmail !== (customer.email ?? ''));

  if (shopLoading || loading) {
    return (
      <div className="team-member-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="team-member-page">
        <button className="card-back" onClick={() => navigate(`/shops/${slug}/customers`)}>
          {t.customers.backToCustomers}
        </button>
        <div className="alert alert-error">{error || t.customers.notFound}</div>
      </div>
    );
  }

  return (
    <div className="team-member-page">
      <button className="card-back" onClick={() => navigate(`/shops/${slug}/customers`)}>
        {t.customers.backToCustomers}
      </button>

      {/* Customer info */}
      <div className="card team-member-card">
        <h1>{customer.name}</h1>
        <div className="team-member-meta">
          <span className="team-date">
            {t.customers.customerSince} {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Edit card */}
      <div className="card team-role-card">
        <h2>{t.customers.editInfo}</h2>
        <div className="form-group">
          <label>{t.customers.nameLabel}</label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>{t.customers.phoneLabel}</label>
          <input
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>{t.customers.emailLabel}</label>
          <input
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder={t.customers.emailOptional}
          />
        </div>
        {saveError && <div className="alert alert-error">{saveError}</div>}
        {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? t.customers.saving : t.customers.save}
        </button>
      </div>

      {/* Recent bookings */}
      <div className="card team-role-card">
        <h2>{t.customers.recentBookings}</h2>
        {customer.bookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.customers.noBookings}</p>
        ) : (
          <div className="team-table-card" style={{ border: 'none', borderRadius: 0 }}>
            <table className="team-table">
              <thead>
                <tr>
                  <th>{t.customers.serviceCol}</th>
                  <th>{t.customers.dateTimeCol}</th>
                  <th>{t.customers.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((b) => (
                  <tr key={b.id} className="team-table-row" style={{ cursor: 'default' }}>
                    <td>{b.service.name}</td>
                    <td className="team-date">
                      {new Date(b.startTime).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
