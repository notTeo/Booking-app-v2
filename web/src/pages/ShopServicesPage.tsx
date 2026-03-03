import { useEffect, useState } from 'react';
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

// ── helpers ────────────────────────────────────────────────

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

type FormData = {
  name: string;
  description: string;
  duration: string;
  price: string;
  isActive: boolean;
};

const emptyForm: FormData = { name: '', description: '', duration: '', price: '', isActive: true };

const serviceToForm = (s: Service): FormData => ({
  name: s.name,
  description: s.description ?? '',
  duration: String(s.duration),
  price: (s.price / 100).toFixed(2),
  isActive: s.isActive,
});

const formToDto = (f: FormData) => ({
  name: f.name.trim(),
  description: f.description.trim() || undefined,
  duration: parseInt(f.duration, 10),
  price: Math.round(parseFloat(f.price) * 100),
  isActive: f.isActive,
});

// ── component ──────────────────────────────────────────────

export default function ShopServicesPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const isOwner = shop?.role === 'owner';

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
    setEditingId(null);
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
    if (!shop) return;
    setCreating(true);
    setCreateError('');
    try {
      const service = await createService(shop.id, formToDto(createForm));
      setServices((prev) => [...prev, service]);
      setCreateForm({ ...emptyForm });
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message ?? t.services.errorCreate);
    } finally {
      setCreating(false);
    }
  };

  // update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !editingId) return;
    setSaving(true);
    setEditError('');
    try {
      const updated = await updateService(shop.id, editingId, formToDto(editForm));
      setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
      setEditingId(null);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? t.services.errorUpdate);
    } finally {
      setSaving(false);
    }
  };

  // delete
  const handleDelete = async (serviceId: string) => {
    if (!shop) return;
    setDeleting(true);
    try {
      await deleteService(shop.id, serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      if (staffServiceId === serviceId) closeStaffPanel();
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
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
    } catch (err: any) {
      setStaffError(err?.response?.data?.message ?? t.services.errorAssign);
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

  // ── service form (shared for create + edit) ──────────────

  const renderServiceForm = (
    form: FormData,
    onChange: (k: keyof FormData, v: string | boolean) => void,
    onSubmit: (e: React.FormEvent) => void,
    submitting: boolean,
    submitLabel: string,
    formError: string,
    onCancel: () => void,
  ) => (
    <form className="service-form card" onSubmit={onSubmit}>
      {formError && <div className="alert alert-error">{formError}</div>}
      <div className="service-form-grid">
        <div className="form-group">
          <label>{t.services.name}</label>
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            required
            placeholder={t.services.name}
          />
        </div>
        <div className="form-group">
          <label>{t.services.duration} (min)</label>
          <input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) => onChange('duration', e.target.value)}
            required
            placeholder="30"
          />
        </div>
        <div className="form-group">
          <label>{t.services.price} (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => onChange('price', e.target.value)}
            required
            placeholder="0.00"
          />
        </div>
        <div className="form-group service-form-active">
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => onChange('isActive', e.target.checked)}
              style={{ width: 'auto' }}
            />
            {' '}{t.services.isActive}
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>{t.services.description}</label>
        <textarea
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder={t.services.description}
          rows={2}
        />
      </div>
      <div className="service-form-actions">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? t.services.saving : submitLabel}
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          {t.services.cancel}
        </button>
      </div>
    </form>
  );

  // ── loading state ─────────────────────────────────────────

  if (shopLoading || loading) {
    return (
      <div className="services-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="services-page">
      <div className="services-header">
        <h1>{t.services.title}</h1>
        {isOwner && !showCreate && !editingId && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            {t.services.addService}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Create form */}
      {showCreate &&
        renderServiceForm(
          createForm,
          (k, v) => setCreateForm((p) => ({ ...p, [k]: v })),
          handleCreate,
          creating,
          t.services.create,
          createError,
          () => { setShowCreate(false); setCreateError(''); },
        )}

      {/* Empty state */}
      {services.length === 0 && !showCreate && (
        <p className="services-empty">{t.services.noServices}</p>
      )}

      {/* Services list */}
      {services.length > 0 && (
        <div className="services-list">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              {editingId === service.id ? (
                renderServiceForm(
                  editForm,
                  (k, v) => setEditForm((p) => ({ ...p, [k]: v })),
                  handleUpdate,
                  saving,
                  t.services.save,
                  editError,
                  () => { setEditingId(null); setEditError(''); },
                )
              ) : (
                <>
                  <div className="service-card-main">
                    <div className="service-card-info">
                      <div className="service-card-name">
                        {service.name}
                        <span
                          className={`service-status-badge service-status-${service.isActive ? 'active' : 'inactive'}`}
                        >
                          {service.isActive ? t.services.active : t.services.inactive}
                        </span>
                      </div>
                      {service.description && (
                        <div className="service-card-desc">{service.description}</div>
                      )}
                      <div className="service-card-meta">
                        <span>{formatDuration(service.duration)}</span>
                        <span className="service-card-sep">·</span>
                        <span>{formatPrice(service.price)}</span>
                      </div>
                    </div>

                    {isOwner && (
                      <div className="service-card-actions">
                        <button
                          className="btn btn-ghost service-action-btn"
                          onClick={() => {
                            closeStaffPanel();
                            setEditingId(service.id);
                            setEditForm(serviceToForm(service));
                            setEditError('');
                          }}
                        >
                          {t.services.edit}
                        </button>

                        <button
                          className={`btn btn-ghost service-action-btn${staffServiceId === service.id ? ' service-action-active' : ''}`}
                          onClick={() => {
                            if (staffServiceId === service.id) {
                              closeStaffPanel();
                            } else {
                              openStaffPanel(service.id);
                            }
                          }}
                        >
                          {t.services.staff}
                        </button>

                        {confirmDeleteId === service.id ? (
                          <div className="service-confirm-delete">
                            <button
                              className="btn btn-danger service-action-btn"
                              onClick={() => handleDelete(service.id)}
                              disabled={deleting}
                            >
                              {deleting ? t.services.deleting : t.services.confirmDelete}
                            </button>
                            <button
                              className="btn btn-ghost service-action-btn"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              {t.services.cancel}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-ghost service-action-btn service-delete-btn"
                            onClick={() => setConfirmDeleteId(service.id)}
                          >
                            {t.services.delete}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Staff panel */}
                  {staffServiceId === service.id && (
                    <div className="service-staff-panel">
                      {loadingDetail ? (
                        <div className="service-staff-loading">
                          <div className="spinner" style={{ width: 24, height: 24 }} />
                        </div>
                      ) : (
                        <>
                          {staffError && <div className="alert alert-error">{staffError}</div>}

                          <div className="service-staff-title">{t.services.assignedStaff}</div>

                          {!serviceDetail?.staffServices?.length ? (
                            <p className="service-staff-empty">{t.services.noStaff}</p>
                          ) : (
                            <ul className="service-staff-list">
                              {serviceDetail.staffServices.map((ss) => (
                                <li key={ss.userShopId} className="service-staff-item">
                                  <span>{ss.userShop.user.email}</span>
                                  <button
                                    className="btn btn-ghost service-action-btn"
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
                              <div className="service-staff-add">
                                <select
                                  value={selectedUserShopId}
                                  onChange={(e) => setSelectedUserShopId(e.target.value)}
                                  className="service-staff-select"
                                >
                                  <option value="">{t.services.selectStaff}</option>
                                  {available.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.user.email}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-primary service-action-btn"
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
