import SaveBar from '../components/SaveBar';
import { formatDateTimeInZone } from '../utils/shopTime';
import { useEffect, useState, useId } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  getCustomer,
  getCustomerBookings,
  updateCustomer,
  exportCustomer,
  deleteCustomer,
  removeCustomerPhoto,
  setCustomerPhoto,
  acceptCustomerChanges,
  rejectCustomerChanges,
  type CustomerBookingsResult,
  type CustomerDetail,
} from '../api/customer.api';
import StatCards from '../components/overview/StatCards';
import StatusDonut from '../components/overview/StatusDonut';
import StatusBadge from '../components/StatusBadge';
import '../styles/pages/team.css';
import '../styles/pages/shop-overview.css';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import MergeCustomerModal from '../components/MergeCustomerModal';
import CustomerServiceDurations from '../components/CustomerServiceDurations';
import { canManageShop } from '../utils/roles';
import { apiErrorField } from '../utils/apiError';
import Avatar from '../components/Avatar';
import PhotoField from '../components/PhotoField';
import { bookingServiceNames } from '../utils/bookingServices';

const BOOKINGS_PAGE_SIZE = 10;

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

  // Deciding on what the customer asked to change on the sign-up page.
  const [changesBusy, setChangesBusy] = useState<'accept' | 'reject' | null>(null);
  const [changesError, setChangesError] = useState('');

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState('');
  // Bumped after a merge so the customer (bookings, totals) loads again.
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [shop?.id, customerId, reloadKey]);

  // The booking history, a page at a time. `bookings` keeps the previous page
  // on screen while the next one loads.
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookings, setBookings] = useState<CustomerBookingsResult | null>(null);
  const [bookingsError, setBookingsError] = useState(false);

  const shopId = shop?.id;
  useEffect(() => {
    if (!shopId || !customerId) return;
    let stale = false;
    getCustomerBookings(shopId, customerId, bookingsPage, BOOKINGS_PAGE_SIZE)
      .then((result) => { if (!stale) { setBookings(result); setBookingsError(false); } })
      .catch(() => { if (!stale) setBookingsError(true); });
    return () => { stale = true; };
  }, [shopId, customerId, bookingsPage, reloadKey]);

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

  const decideChanges = async (decision: 'accept' | 'reject') => {
    if (!shop || !customerId || changesBusy) return;
    setChangesBusy(decision);
    setChangesError('');
    try {
      const updated = await (decision === 'accept' ? acceptCustomerChanges : rejectCustomerChanges)(shop.id, customerId);
      setCustomer(updated);
      setEditName(updated.name);
      setEditPhone(updated.phone);
      setEditEmail(updated.email ?? '');
    } catch (err: unknown) {
      setChangesError(
        apiErrorField(err, 'code') === 'CUSTOMER_EXISTS'
          ? t.customerProfile.changesPhoneTaken
          : t.customerProfile.changesError,
      );
    } finally {
      setChangesBusy(null);
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

  const bookingsPages = Math.max(1, Math.ceil((bookings?.total ?? 0) / BOOKINGS_PAGE_SIZE));

  const isDirty =
    customer &&
    (editName !== customer.name ||
      editPhone !== customer.phone ||
      editEmail !== (customer.email ?? '') ||
      editNotes !== (customer.notes ?? ''));

  if (shopLoading || loading) {
    return (
      <div className="customer-page">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="customer-page">
        <div className="cluster">
          <Link className="btn btn--secondary btn--sm" to={`/shops/${slug}/customers`}>
            <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
            {t.customers.backToCustomers}
          </Link>
        </div>
        <Alert variant="danger">{error || t.customers.notFound}</Alert>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <div className="cluster">
        <Link className="btn btn--secondary btn--sm" to={`/shops/${slug}/customers`}>
          <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
          {t.customers.backToCustomers}
        </Link>
      </div>

      {/* Customer info, with this customer's lifetime numbers in a column beside it */}
      <div className="customer-head">
        <div className="card team-member-card">
          {!customer.contactHidden && customer.photoUrl && (
            <Avatar name={customer.name} photoUrl={customer.photoUrl} size="xl" />
          )}
          <h1 className="t-heading">{customer.contactHidden ? t.customers.hiddenLabel : customer.name}</h1>
          <div className="cluster">
            <span className="t-body-sm t-muted">
              {t.customers.customerSince} {new Date(customer.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="cluster">
            <span className="t-body-sm t-muted">{t.customers.totalSpentLabel}: {formatPrice(customer.totalSpent)}</span>
          </div>
        </div>
        <StatCards totals={customer.totals} tiles />
      </div>

      {/* What the customer asked to change themselves (owner and managers; the API enforces it too) */}
      {customer.changeRequest && (
        <div className="card">
          <h2 className="card__title">{t.customerProfile.changesTitle}</h2>
          <p className="card__text">{t.customerProfile.changesDesc}</p>
          {(
            [
              [t.customers.nameLabel, customer.name, customer.changeRequest.name],
              [t.customers.phoneLabel, customer.phone, customer.changeRequest.phone],
              [t.customers.emailLabel, customer.email, customer.changeRequest.email],
            ] as const
          ).map(
            ([label, current, asked]) =>
              asked && (
                <p key={label} className="card__text">
                  <span className="label-caps">{label}</span>
                  <br />
                  <span className="t-muted">{current || '—'}</span> → <strong>{asked}</strong>
                </p>
              ),
          )}
          {customer.changeRequest.photoUrl && (
            <div className="cluster">
              <Avatar name={customer.name} photoUrl={customer.changeRequest.photoUrl} size="lg" />
              <span className="t-body-sm">{t.customerProfile.changesPhoto}</span>
            </div>
          )}
          {changesError && <Alert variant="danger">{changesError}</Alert>}
          <div className="cluster">
            <button
              className={`btn${changesBusy === 'accept' ? ' is-loading' : ''}`}
              onClick={() => decideChanges('accept')}
              aria-busy={changesBusy === 'accept'}
              disabled={changesBusy === 'reject'}
            >
              {t.customerProfile.changesAccept}
            </button>
            <button
              className={`btn btn--secondary${changesBusy === 'reject' ? ' is-loading' : ''}`}
              onClick={() => decideChanges('reject')}
              aria-busy={changesBusy === 'reject'}
              disabled={changesBusy === 'accept'}
            >
              {t.customerProfile.changesReject}
            </button>
          </div>
        </div>
      )}

      {customer.totals.all + customer.totals.canceled > 0 && <StatusDonut totals={customer.totals} />}

      {/* Booking history: every booking, ten at a time */}
      <div className="card">
        <h2 className="card__title">{t.customers.bookingHistory}</h2>
        {bookingsError && <Alert variant="danger">{t.customers.bookingsErrorLoad}</Alert>}
        <div className="table-wrap">
          <div className="table-surface">
            {!bookings ? (
              !bookingsError && (
                <div className="spinner-wrap">
                  <div className="spinner" />
                </div>
              )
            ) : bookings.total === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">{t.customers.noBookings}</p>
              </div>
            ) : (
              <table className="data-table" role="table">
                <thead>
                  <tr role="row">
                    <th scope="col" role="columnheader">{t.customers.serviceCol}</th>
                    <th scope="col" role="columnheader">{t.customers.dateTimeCol}</th>
                    <th scope="col" role="columnheader">{t.customers.providerCol}</th>
                    <th scope="col" role="columnheader">{t.customers.statusCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.items.map((b) => (
                    <tr key={b.id} role="row">
                      <td role="cell" data-label={t.customers.serviceCol} className="data-table__title">{bookingServiceNames(b)}</td>
                      <td role="cell" data-label={t.customers.dateTimeCol}>
                        {formatDateTimeInZone(b.startTime, shop!.timezone)}
                      </td>
                      <td role="cell" data-label={t.customers.providerCol}>{b.staff.name}</td>
                      <td role="cell" data-label={t.customers.statusCol}>
                        <StatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {bookings && bookings.total > BOOKINGS_PAGE_SIZE && (
              <div className="data-table__foot">
                <span>
                  {t.customers.pageOf
                    .replace('{page}', String(bookings.page))
                    .replace('{total}', String(bookingsPages))}
                </span>
                <div className="cluster cluster--tight">
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                    disabled={bookingsPage <= 1}
                    aria-label={t.customers.prevPageLabel}
                  >
                    {t.customers.prevPage}
                  </button>
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setBookingsPage((p) => Math.min(bookingsPages, p + 1))}
                    disabled={bookingsPage >= bookingsPages}
                    aria-label={t.customers.nextPageLabel}
                  >
                    {t.customers.nextPage}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit card */}
      {customer.contactHidden ? (
        <div className="card">
          <h2 className="card__title">{t.customers.editInfo}</h2>
          <p className="card__text">{t.customers.contactHiddenNotice}</p>
        </div>
      ) : (
        <div className={`card${isDirty ? ' card--unsaved' : ''}`}>
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
          {isDirty ? (
            <SaveBar label={t.customers.save} saving={saving} onSave={handleSave} />
          ) : (
            <button className="btn" disabled>{t.customers.save}</button>
          )}
        </div>
      )}

      {/* The customer's photo (owner and managers; the API enforces it too) */}
      {shop && canManageShop(shop.role) && !customer.contactHidden && (
        <div className="card">
          <h2 className="card__title">{t.customerProfile.photoTitle}</h2>
          <PhotoField
            photo={{
              photoUrl: customer.photoUrl ?? null,
              photoOriginalUrl: customer.photoOriginalUrl ?? null,
              photoCrop: customer.photoCrop ?? null,
            }}
            shape="round"
            canEdit
            camera
            preview={<Avatar name={customer.name} photoUrl={customer.photoUrl} size="xl" />}
            onUpload={async (file, crop) => {
              const updated = await setCustomerPhoto(shop.id, customer.id, file, crop);
              setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
            }}
            onRemove={async () => {
              const updated = await removeCustomerPhoto(shop.id, customer.id);
              setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
            }}
          >
            <p className="card__text">{t.customerProfile.photoDesc}</p>
          </PhotoField>
        </div>
      )}

      {shop && (
        <CustomerServiceDurations
          // Remount after a merge, which can bring durations over.
          key={reloadKey}
          shopId={shop.id}
          customerId={customer.id}
          durations={customer.serviceDurations}
          onSaved={(serviceDurations) => setCustomer((prev) => (prev ? { ...prev, serviceDurations } : prev))}
        />
      )}

      {/* Merge a duplicate record into this one (owner and managers; the API enforces it too) */}
      {canManageShop(shop?.role) && !customer.contactHidden && (
        <div className="card">
          <h2 className="card__title">{t.customers.mergeHeading}</h2>
          <p className="card__text">{t.customers.mergeBody}</p>
          {mergeSuccess && <Alert variant="success">{mergeSuccess}</Alert>}
          <div className="cluster">
            <button className="btn btn--secondary" onClick={() => { setMergeSuccess(''); setMergeOpen(true); }}>
              {t.customers.mergeButton}
            </button>
          </div>
        </div>
      )}

      {/* GDPR: access + erasure requests (owner only; the API enforces it too) */}
      {shop?.role === 'owner' && (
        <div className="card">
          <h2 className="card__title">{t.customers.privacyHeading}</h2>
          <p className="card__text">{t.customers.privacyBody}</p>
          {privacyError && <Alert variant="danger">{privacyError}</Alert>}
          <div className="cluster">
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

      {mergeOpen && shop && (
        <MergeCustomerModal
          shopId={shop.id}
          target={customer}
          onClose={() => setMergeOpen(false)}
          onMerged={(merged) => {
            setMergeOpen(false);
            setMergeSuccess(t.customers.mergeSuccess.replace('{count}', String(merged.movedBookings)));
            setBookingsPage(1);
            setReloadKey((k) => k + 1);
          }}
        />
      )}

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
