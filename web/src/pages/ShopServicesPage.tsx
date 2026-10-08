import { useEffect, useState } from 'react';
import { canManageShop } from '../utils/roles';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  assignStaff,
  unassignStaff,
  type Service,
  type ServiceWithStaff,
} from '../api/service.api';
import { getMembers, type TeamMember } from '../api/team.api';
import '../styles/pages/services.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPenToSquare, faTrashCan, faUsers } from '@fortawesome/free-solid-svg-icons';
import { apiErrorField, apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import ServiceFormModal from '../components/ServiceFormModal';
import {
  emptyServiceForm,
  formatServiceDuration,
  formatServicePrice,
  serviceFormToDto,
  serviceToForm,
  type ServiceFormData,
} from '../utils/serviceForm';

type FormData = ServiceFormData;
const emptyForm = emptyServiceForm;
const formToDto = serviceFormToDto;
const formatDuration = formatServiceDuration;
const formatPrice = formatServicePrice;

// ── component ──────────────────────────────────────────────

export default function ShopServicesPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const canManage = canManageShop(shop?.role);

  // list
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormData>({ ...emptyForm });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // The API refused the delete because the service has bookings; the dialog
  // then offers to deactivate it instead.
  const [hasBookingsId, setHasBookingsId] = useState<string | null>(null);

  // staff panel
  const [staffServiceId, setStaffServiceId] = useState<string | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ServiceWithStaff | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserShopId, setSelectedUserShopId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [staffError, setStaffError] = useState('');

  // load services
  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    getServices(shop.id)
      .then(setServices)
      .catch(() => setError(t.services.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id]);

  // open staff panel — load detail + team members
  const openStaffPanel = async (serviceId: string) => {
    if (!shop) return;
    setStaffServiceId(serviceId);
    setStaffError('');
    setSelectedUserShopId('');
    setLoadingDetail(true);
    try {
      const [detail, members] = await Promise.all([
        getService(shop.id, serviceId),
        teamMembers.length > 0 ? Promise.resolve(teamMembers) : getMembers(shop.id),
      ]);
      setServiceDetail(detail);
      if (teamMembers.length === 0) setTeamMembers(members);
    } catch {
      setStaffError(t.services.errorLoad);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeStaffPanel = () => {
    setStaffServiceId(null);
    setServiceDetail(null);
  };

  // create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const service = await createService(shop.id, formToDto(createForm));
      setServices((prev) => [...prev, service]);
      setCreateForm({ ...emptyForm });
      setShowCreate(false);
    } catch (err: unknown) {
      setCreateError(apiErrorMessage(err, t.services.errorCreate));
    } finally {
      setCreating(false);
    }
  };

  // update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !editingId || saving) return;
    setSaving(true);
    setEditError('');
    try {
      const updated = await updateService(shop.id, editingId, formToDto(editForm));
      setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      setEditingId(null);
    } catch (err: unknown) {
      setEditError(apiErrorMessage(err, t.services.errorUpdate));
    } finally {
      setSaving(false);
    }
  };

  // delete
  const closeDeleteDialog = () => {
    setConfirmDeleteId(null);
    setHasBookingsId(null);
  };

  const handleDelete = async (serviceId: string) => {
    if (!shop) return;
    setDeleting(true);
    try {
      await deleteService(shop.id, serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      if (staffServiceId === serviceId) closeStaffPanel();
      closeDeleteDialog();
    } catch (err: unknown) {
      if (apiErrorField(err, 'code') === 'SERVICE_HAS_BOOKINGS') {
        if (services.find((s) => s.id === serviceId)?.isActive) {
          setConfirmDeleteId(null);
          setHasBookingsId(serviceId);
        } else {
          closeDeleteDialog();
          setError(t.services.errorHasBookingsInactive);
        }
      } else {
        closeDeleteDialog();
        setError(apiErrorMessage(err, t.services.errorDelete));
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async (serviceId: string) => {
    if (!shop) return;
    setDeleting(true);
    try {
      const updated = await updateService(shop.id, serviceId, { isActive: false });
      setServices((prev) => prev.map((s) => (s.id === serviceId ? updated : s)));
      closeDeleteDialog();
    } catch {
      closeDeleteDialog();
      setError(t.services.errorDeactivate);
    } finally {
      setDeleting(false);
    }
  };

  // assign staff
  const handleAssign = async () => {
    if (!shop || !staffServiceId || !selectedUserShopId) return;
    setAssigning(true);
    setStaffError('');
    try {
      await assignStaff(shop.id, staffServiceId, selectedUserShopId);
      const detail = await getService(shop.id, staffServiceId);
      setServiceDetail(detail);
      setSelectedUserShopId('');
    } catch (err: unknown) {
      setStaffError(apiErrorMessage(err, t.services.errorAssign));
    } finally {
      setAssigning(false);
    }
  };

  // unassign staff
  const handleUnassign = async (userShopId: string) => {
    if (!shop || !staffServiceId) return;
    setUnassigningId(userShopId);
    setStaffError('');
    try {
      await unassignStaff(shop.id, staffServiceId, userShopId);
      const detail = await getService(shop.id, staffServiceId);
      setServiceDetail(detail);
    } catch {
      setStaffError(t.services.errorUnassign);
    } finally {
      setUnassigningId(null);
    }
  };

  // ── loading state ─────────────────────────────────────────

  if (shopLoading || loading) {
    return (
      <div className="services-page">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="services-page">
      <div className="page-header">
        <h1 className="t-title">{t.services.title}</h1>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Empty state */}
      {services.length === 0 && (
        <div className="empty empty--sm">
          <p className="empty__text">{t.services.noServices}</p>
        </div>
      )}

      {/* Services list (+ add card) */}
      {(services.length > 0 || canManage) && (
        <div className="services-list">
          {services.map((service) => (
            <div key={service.id} className="card card--flush">
              <div className="card__section">
                <div className="service-card__main">
                  <span className="service-card__name">{service.name}</span>
                  {service.description && (
                    <div className="service-card__desc">{service.description}</div>
                  )}
                  <div className="cluster cluster--tight">
                    <span
                      className={`badge badge--wrap ${service.isActive ? 'badge--success' : 'badge--neutral'}`}
                    >
                      {service.isActive ? t.services.active : t.services.inactive}
                    </span>
                    {!service.showOnPublicPage && (
                      <span className="badge badge--neutral badge--wrap">{t.services.internalOnly}</span>
                    )}
                    <span className="badge badge--neutral badge--wrap">{formatDuration(service.duration)}</span>
                    <span className="badge badge--neutral badge--wrap">{formatPrice(service.price)}</span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="card__section">
                  <div className="cluster cluster--tight">
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        setEditingId(service.id);
                        setEditForm(serviceToForm(service));
                        setEditError('');
                      }}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} /> {t.services.edit}
                    </button>

                    <button
                      className="btn btn--secondary btn--sm"
                      aria-expanded={staffServiceId === service.id}
                      onClick={() => {
                        if (staffServiceId === service.id) {
                          closeStaffPanel();
                        } else {
                          openStaffPanel(service.id);
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faUsers} /> {t.services.staff}
                    </button>

                    <button
                      className="btn btn--danger-outline btn--sm"
                      onClick={() => setConfirmDeleteId(service.id)}
                    >
                      <FontAwesomeIcon icon={faTrashCan} /> {t.services.delete}
                    </button>
                  </div>
                </div>
              )}

              {/* Staff panel */}
              {staffServiceId === service.id && (
                <div className="card__section">
                  {loadingDetail ? (
                    <div className="spinner-wrap">
                      <div className="spinner" />
                    </div>
                  ) : (
                    <>
                      {staffError && <Alert variant="danger">{staffError}</Alert>}

                      <h3 className="t-caption label-caps t-muted">{t.services.assignedStaff}</h3>

                      {!serviceDetail?.staffServices?.length ? (
                        <p className="card__text">{t.services.noStaff}</p>
                      ) : (
                        <ul className="list">
                          {serviceDetail.staffServices.map((ss) => (
                            <li key={ss.userShopId} className="list__item">
                              <span>{ss.userShop.name}</span>
                              <button
                                className="btn btn--danger-outline btn--sm"
                                onClick={() => handleUnassign(ss.userShopId)}
                                disabled={unassigningId === ss.userShopId}
                              >
                                {unassigningId === ss.userShopId ? '...' : t.services.removeStaff}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add staff dropdown */}
                      {(() => {
                        const assignedIds = new Set(
                          serviceDetail?.staffServices?.map((ss) => ss.userShopId) ?? [],
                        );
                        const available = teamMembers.filter((m) => !assignedIds.has(m.id));
                        if (available.length === 0) return null;
                        return (
                          <div className="cluster cluster--tight">
                            <div className="select-wrap select-wrap--sm service-staff-select"><select
                              value={selectedUserShopId}
                              onChange={(e) => setSelectedUserShopId(e.target.value)}
                              className="select select--sm"
                              aria-label={t.services.selectStaff}
                            >
                              <option value="">{t.services.selectStaff}</option>
                              {available.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select></div>
                            <button
                              className="btn btn--sm"
                              onClick={handleAssign}
                              disabled={!selectedUserShopId || assigning}
                            >
                              {assigning ? t.services.assigning : t.services.addStaff}
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {canManage && (
            <button type="button" className="card card--interactive card--dashed" onClick={() => { setCreateForm({ ...emptyForm }); setCreateError(''); setShowCreate(true); }}>
              <FontAwesomeIcon icon={faPlus} />
              <span>{t.services.addService}</span>
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <ServiceFormModal
          title={t.services.addService}
          submitLabel={t.services.create}
          form={createForm}
          onChange={(k, v) => setCreateForm((p) => ({ ...p, [k]: v }))}
          onSubmit={handleCreate}
          submitting={creating}
          error={createError}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingId && (
        <ServiceFormModal
          title={t.services.edit}
          submitLabel={t.services.save}
          form={editForm}
          onChange={(k, v) => setEditForm((p) => ({ ...p, [k]: v }))}
          onSubmit={handleUpdate}
          submitting={saving}
          error={editError}
          onClose={() => setEditingId(null)}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          tone="danger"
          title={t.services.deleteTitle.replace('{name}', services.find((sv) => sv.id === confirmDeleteId)?.name ?? '')}
          message={t.services.deleteMessage}
          confirmLabel={t.services.deleteConfirmButton}
          cancelLabel={t.services.cancel}
          busy={deleting}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={closeDeleteDialog}
        />
      )}

      {hasBookingsId && (
        <ConfirmDialog
          tone="warning"
          title={t.services.deactivateTitle.replace('{name}', services.find((sv) => sv.id === hasBookingsId)?.name ?? '')}
          message={t.services.errorHasBookings}
          confirmLabel={t.services.deactivate}
          cancelLabel={t.services.cancel}
          busy={deleting}
          onConfirm={() => handleDeactivate(hasBookingsId)}
          onCancel={closeDeleteDialog}
        />
      )}
    </div>
  );
}
