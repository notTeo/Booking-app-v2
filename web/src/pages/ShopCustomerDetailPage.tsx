import { formatDateTimeInZone } from '../utils/shopTime';
import { useEffect, useState, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getCustomer, updateCustomer, exportCustomer, deleteCustomer, type CustomerDetail } from '../api/customer.api';
import StatusBadge from '../components/StatusBadge';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export default function ShopCustomerDetailPage() {
  const uid = useId();
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

  const [privacyBusy, setPrivacyBusy] = useState<'export' | 'delete' | null>(null);
  const [privacyError, setPrivacyError] = useState('');

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
    if (!shop || !customerId || saving) return;
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

  const handleExport = async () => {
    if (!shop || !customerId || privacyBusy !== null) return;
    setPrivacyBusy('export');
    setPrivacyError('');
    try {
      const data = await exportCustomer(shop.id, customerId);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-${customerId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setPrivacyError(t.customers.exportError);
    } finally {
      setPrivacyBusy(null);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!shop || !customerId) return;
    setPrivacyBusy('delete');
    setPrivacyError('');
    try {
      await deleteCustomer(shop.id, customerId);
      navigate(`/shops/${slug}/customers`, { replace: true });
    } catch {
      setConfirmDelete(false);
      setPrivacyError(t.customers.deleteError);
      setPrivacyBusy(null);
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
        <Alert variant="danger">{error || t.customers.notFound}</Alert>
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
        <h1 className="t-heading">{customer.contactHidden ? t.customers.hiddenLabel : customer.name}</h1>
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
        <div className="card">
          <h2 className="card__title">{t.customers.editInfo}</h2>
          <p className="team-empty">{t.customers.contactHiddenNotice}</p>
        </div>
      ) : (
        <div className="card">
          <h2 className="card__title">{t.customers.editInfo}</h2>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-name`}>{t.customers.nameLabel}</label>
            <input id={`${uid}-name`} className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-phone`}>{t.customers.phoneLabel}</label>
            <input id={`${uid}-phone`} className="input"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-email`}>{t.customers.emailLabel}</label>
            <input id={`${uid}-email`} className="input"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder={t.customers.emailOptional}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-notes`}>{t.customers.notesLabel}</label>
            <textarea id={`${uid}-notes`} className="textarea"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder={t.customers.notesOptional}
              rows={3}
            />
          </div>
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
          <button
            className={`btn${saving ? ' is-loading' : ''}`}
            onClick={handleSave}
            aria-busy={saving}
            disabled={!isDirty}
          >
            {t.customers.save}
          </button>
        </div>
      )}

      {/* GDPR: access + erasure requests (owner only; the API enforces it too) */}
      {shop?.role === 'owner' && (
        <div className="card">
          <h2 className="card__title">{t.customers.privacyHeading}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t.customers.privacyBody}</p>
          {privacyError && <Alert variant="danger">{privacyError}</Alert>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn--secondary${privacyBusy === 'export' ? ' is-loading' : ''}`}
              onClick={handleExport}
              aria-busy={privacyBusy === 'export'}
              disabled={privacyBusy === 'delete'}
            >
              {t.customers.exportData}
            </button>
            <button
              className={`btn btn--danger-outline${privacyBusy === 'delete' ? ' is-loading' : ''}`}
              onClick={() => setConfirmDelete(true)}
              aria-busy={privacyBusy === 'delete'}
              disabled={privacyBusy === 'export'}
            >
              {t.customers.deleteCustomer}
            </button>
          </div>
        </div>
      )}

      {/* Recent bookings */}
      <div className="card">
        <h2 className="card__title">{t.customers.recentBookings}</h2>
        <div className="table-wrap">
          <div className="table-surface">
            {customer.bookings.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">{t.customers.noBookings}</p>
              </div>
            ) : (
              <table className="data-table" role="table">
                <thead>
                  <tr role="row">
                    <th scope="col" role="columnheader">{t.customers.serviceCol}</th>
                    <th scope="col" role="columnheader">{t.customers.dateTimeCol}</th>
                    <th scope="col" role="columnheader">{t.customers.statusCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.bookings.map((b) => (
                    <tr key={b.id} role="row">
                      <td role="cell" data-label={t.customers.serviceCol} className="data-table__title">{b.service.name}</td>
                      <td role="cell" data-label={t.customers.dateTimeCol}>
                        {formatDateTimeInZone(b.startTime, shop!.timezone)}
                      </td>
                      <td role="cell" data-label={t.customers.statusCol}>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {confirmDelete && customer && (
        <ConfirmDialog
          tone="danger"
          title={t.customers.deleteTitle.replace('{name}', customer.name)}
          message={t.customers.deleteConfirm}
          confirmLabel={t.customers.deleteConfirmButton}
          cancelLabel={t.customers.cancel}
          busy={privacyBusy === 'delete'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
