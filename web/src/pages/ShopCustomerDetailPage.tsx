import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomer, updateCustomer, type CustomerDetail } from '../api/customer.api';
import type { BookingStatus } from '../api/booking.api';
import '../styles/pages/team.css';

function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

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
  const [editNotes, setEditNotes] = useState('');
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
        setEditNotes(c.notes ?? '');
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
        notes: editNotes || null,
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
      editEmail !== (customer.email ?? '') ||
      editNotes !== (customer.notes ?? ''));

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
        <h1>{customer.contactHidden ? t.customers.hiddenLabel : customer.name}</h1>
        <div className="team-member-meta">
          <span className="team-date">
            {t.customers.customerSince} {new Date(customer.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className="team-member-meta">
          <span className="team-date">{t.customers.totalVisitsLabel}: {customer.totalVisits}</span>
          <span className="team-date">{t.customers.totalSpentLabel}: {formatPrice(customer.totalSpent)}</span>
        </div>
      </div>

      {/* Edit card */}
      {customer.contactHidden ? (
        <div className="card team-role-card">
          <h2>{t.customers.editInfo}</h2>
          <p className="team-empty">{t.customers.contactHiddenNotice}</p>
        </div>
      ) : (
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
          <div className="form-group">
            <label>{t.customers.notesLabel}</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder={t.customers.notesOptional}
              rows={3}
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
      )}

      {/* Recent bookings */}
      <div className="card team-role-card">
        <h2>{t.customers.recentBookings}</h2>
        {customer.bookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.customers.noBookings}</p>
        ) : (
          <div className="data-table-card" style={{ border: 'none', borderRadius: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.customers.serviceCol}</th>
                  <th>{t.customers.dateTimeCol}</th>
                  <th>{t.customers.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((b) => (
                  <tr key={b.id} className="data-table-row">
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
