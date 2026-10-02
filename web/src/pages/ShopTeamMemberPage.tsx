import { useEffect, useState, useId } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  getMember,
  updateMemberRole,
  removeMember,
  sendLoginInvite,
  cancelLoginInvite,
  type TeamMember,
} from '../api/team.api';
import * as whApi from '../api/workingHours.api';
import {
  getMemberServices,
  getServices,
  assignStaff,
  unassignStaff,
  type MemberServiceAssignment,
  type Service,
} from '../api/service.api';
import WorkingHoursPanel, { type WorkingHoursApi } from '../components/WorkingHoursPanel';
import Switch from '../components/Switch';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ShopTeamMemberPage() {
  const uid = useId();
  const { slug, memberId } = useParams<{ slug: string; memberId: string }>();
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Member & Access — name/role/email/permissions, saved together
  const [editRole, setEditRole] = useState<'owner' | 'staff'>('staff');
  const [editCanView, setEditCanView] = useState(true);
  const [editEmail, setEditEmail] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editBookableByCustomers, setEditBookableByCustomers] = useState(true);
  const [editBookableInternally, setEditBookableInternally] = useState(true);
  const [savingMember, setSavingMember] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState('');
  const [memberError, setMemberError] = useState('');
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);

  // Login invite — its own action (sends an email), stays separate
  const [invitePending, setInvitePending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Remove
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Services
  const [memberServices, setMemberServices] = useState<MemberServiceAssignment[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [assigningService, setAssigningService] = useState(false);
  const [unassigningServiceId, setUnassigningServiceId] = useState<string | null>(null);

  const isOwner = shop?.role === 'owner';

  useEffect(() => {
    if (!shop || !memberId) return;
    setLoading(true);
    getMember(shop.id, memberId)
      .then((m) => {
        setMember(m);
        setEditRole(m.role);
        setEditCanView(m.canViewCustomerDetails);
        setEditEmail(m.email ?? '');
        setEditActive(m.active);
        setEditBookableByCustomers(m.bookableByCustomers);
        setEditBookableInternally(m.bookableInternally);
      })
      .catch(() => setError(t.team.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id, memberId]);

  useEffect(() => {
    if (!shop || !memberId) return;
    setServicesLoading(true);
    Promise.all([getMemberServices(shop.id, memberId), getServices(shop.id)])
      .then(([assignments, services]) => {
        setMemberServices(assignments);
        setAllServices(services);
      })
      .catch(() => setServicesError(t.team.errorLoadServices))
      .finally(() => setServicesLoading(false));
  }, [shop?.id, memberId]);

  const isMemberDirty =
    !!member &&
    (editRole !== member.role ||
      editCanView !== member.canViewCustomerDetails ||
      editEmail !== (member.email ?? '') ||
      editActive !== member.active ||
      editBookableByCustomers !== member.bookableByCustomers ||
      editBookableInternally !== member.bookableInternally);
  const isOwnerChange = !!member && editRole !== member.role && (editRole === 'owner' || member.role === 'owner');

  // Turning Active off also turns off both bookable toggles — an inactive
  // member should never be selectable anywhere. Turning it back on is
  // restored by the server on save, and the form resyncs from its response.
  const handleActiveChange = (checked: boolean) => {
    setEditActive(checked);
    if (!checked) {
      setEditBookableByCustomers(false);
      setEditBookableInternally(false);
    }
  };

  const handleRoleChange = (role: 'owner' | 'staff') => {
    setEditRole(role);
    setConfirmRoleChange(false);
    // The owner can never be inactive, since that would lock them out of
    // their own shop.
    if (role === 'owner') setEditActive(true);
  };

  const saveMemberChange = async () => {
    if (!shop || !memberId || !member || savingMember) return;
    setSavingMember(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      const dto: {
        role: 'owner' | 'staff';
        canViewCustomerDetails: boolean;
        email?: string;
        active: boolean;
        bookableByCustomers: boolean;
        bookableInternally: boolean;
      } = {
        role: editRole,
        canViewCustomerDetails: editCanView,
        active: editActive,
        bookableByCustomers: editBookableByCustomers,
        bookableInternally: editBookableInternally,
      };
      if (editEmail !== (member.email ?? '')) dto.email = editEmail;
      const updated = await updateMemberRole(shop.id, memberId, dto);
      setMember(updated);
      // Show what the server stored, not the local toggles — e.g. reactivating
      // turns both bookable flags back on server-side.
      setEditRole(updated.role);
      setEditCanView(updated.canViewCustomerDetails);
      setEditEmail(updated.email ?? '');
      setEditActive(updated.active);
      setEditBookableByCustomers(updated.bookableByCustomers);
      setEditBookableInternally(updated.bookableInternally);
      setMemberSuccess(t.team.roleUpdated);
      setConfirmRoleChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setConfirmRoleChange(false);
      setMemberError(msg || t.team.errorUpdateRole);
    } finally {
      setSavingMember(false);
    }
  };

  const handleSaveMember = () => {
    if (isOwnerChange && !confirmRoleChange) {
      setConfirmRoleChange(true);
      return;
    }
    saveMemberChange();
  };

  const handleRemove = async () => {
    if (!shop || !memberId) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await removeMember(shop.id, memberId);
      navigate(`/shops/${slug}/team`);
    } catch {
      setConfirmRemove(false);
      setRemoveError(t.team.errorRemove);
      setRemoving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!shop || !memberId || invitePending) return;
    setInvitePending(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const updated = await sendLoginInvite(shop.id, memberId);
      setMember(updated);
      setInviteSuccess(t.team.inviteSent);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; code?: string } } }).response?.data;
      setInviteError(
        data?.code === 'MEMBER_INACTIVE' ? t.team.errorInviteInactive : data?.message || t.team.errorSendInvite,
      );
    } finally {
      setInvitePending(false);
    }
  };

  const handleCancelInvite = async () => {
    if (!shop || !memberId) return;
    setInvitePending(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const updated = await cancelLoginInvite(shop.id, memberId);
      setMember(updated);
    } catch {
      setInviteError(t.team.errorCancelInvite);
    } finally {
      setInvitePending(false);
    }
  };

  const handleAssignService = async () => {
    if (!shop || !memberId || !selectedServiceId || !member) return;
    setAssigningService(true);
    setServicesError('');
    try {
      await assignStaff(shop.id, selectedServiceId, member.id); // member.id = UserShop.id
      const assignments = await getMemberServices(shop.id, memberId);
      setMemberServices(assignments);
      setSelectedServiceId('');
    } catch (err: unknown) {
      const msg =
        err instanceof Error && (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setServicesError(msg || t.team.errorAssignService);
    } finally {
      setAssigningService(false);
    }
  };

  const handleUnassignService = async (serviceId: string) => {
    if (!shop || !memberId || !member) return;
    setUnassigningServiceId(serviceId);
    setServicesError('');
    try {
      await unassignStaff(shop.id, serviceId, member.id); // member.id = UserShop.id
      const assignments = await getMemberServices(shop.id, memberId);
      setMemberServices(assignments);
    } catch {
      setServicesError(t.team.errorUnassignService);
    } finally {
      setUnassigningServiceId(null);
    }
  };

  // Staff working hours API bundle
  const workingHoursApi: WorkingHoursApi | null =
    shop && memberId
      ? {
          getSchedules: () => whApi.getStaffSchedules(shop.id, memberId),
          createSchedule: (dto) => whApi.createStaffSchedule(shop.id, memberId, dto),
          updateSchedule: (scheduleId, dto) =>
            whApi.updateStaffSchedule(shop.id, memberId, scheduleId, dto),
          deleteSchedule: (scheduleId) =>
            whApi.deleteStaffSchedule(shop.id, memberId, scheduleId),
          upsertDays: (scheduleId, dto) =>
            whApi.upsertStaffDays(shop.id, memberId, scheduleId, dto),
        }
      : null;

  if (shopLoading || loading) {
    return (
      <div className="team-member-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="team-member-page">
        <button className="card-back" onClick={() => navigate(`/shops/${slug}/team`)}>
          {t.team.backToTeam}
        </button>
        <Alert variant="danger">{error || t.team.notFound}</Alert>
      </div>
    );
  }

  return (
    <div className="team-member-page">
      {/* Back link */}
      <button className="card-back" onClick={() => navigate(`/shops/${slug}/team`)}>
        {t.team.backToTeam}
      </button>

      {/* Member & Access — identity, role/permissions, and login invite, one save */}
      <div className="card team-member-card">
        <h1 className="t-heading">{member.name}</h1>
        <div className="team-member-meta">
          <span className={`badge ${member.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
            {t.team.roles[member.role]}
          </span>
          <span className="team-date">
            {t.team.joined}: {new Date(member.createdAt).toLocaleDateString()}
          </span>
        </div>

        {isOwner ? (
          <>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-email`}>{t.team.emailLabel}</label>
              <input id={`${uid}-email`} className="input"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="staff@example.com"
                disabled={savingMember}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor={`${uid}-role`}>{t.team.role}</label>
              <div className="select-wrap"><select id={`${uid}-role`} className="select"
                value={editRole}
                onChange={(e) => handleRoleChange(e.target.value as 'owner' | 'staff')}
              >
                <option value="staff">{t.team.roles.staff}</option>
                <option value="owner">{t.team.roles.owner}</option>
              </select></div>
            </div>

            <div className="team-switch-row">
              <div className="team-switch-label">
                <span>{t.team.active}</span>
                <span className="team-switch-desc">
                  {editRole === 'owner' ? t.team.ownerAlwaysActiveHint : t.team.activeDesc}
                </span>
              </div>
              <Switch
                checked={editActive}
                onChange={handleActiveChange}
                label={t.team.active}
                disabled={editRole === 'owner'}
              />
            </div>

            <div className="team-switch-row">
              <div className="team-switch-label">
                <span>{t.team.bookableByCustomers}</span>
                <span className="team-switch-desc">{t.team.bookableByCustomersDesc}</span>
              </div>
              <Switch
                checked={editBookableByCustomers}
                onChange={setEditBookableByCustomers}
                label={t.team.bookableByCustomers}
                disabled={!editActive}
              />
            </div>

            <div className="team-switch-row">
              <div className="team-switch-label">
                <span>{t.team.bookableInternally}</span>
                <span className="team-switch-desc">{t.team.bookableInternallyDesc}</span>
              </div>
              <Switch
                checked={editBookableInternally}
                onChange={setEditBookableInternally}
                label={t.team.bookableInternally}
                disabled={!editActive}
              />
            </div>

            {editRole === 'staff' && (
              <div className="team-switch-row">
                <div className="team-switch-label">
                  <span>{t.team.canViewCustomerDetails}</span>
                  <span className="team-switch-desc">{t.team.canViewCustomerDetailsDesc}</span>
                </div>
                <Switch checked={editCanView} onChange={setEditCanView} label={t.team.canViewCustomerDetails} />
              </div>
            )}

            {memberError && <Alert variant="danger">{memberError}</Alert>}
            {memberSuccess && <Alert variant="success">{memberSuccess}</Alert>}
            <div className="team-invite-actions">
              <button
                className={`btn${savingMember ? ' is-loading' : ''}`}
                onClick={handleSaveMember}
                aria-busy={savingMember}
                disabled={!isMemberDirty}
              >
                {t.team.saveRole}
              </button>
            </div>

            {/* Login invite — only relevant until they accept and get a login;
                sends an email, so it stays a distinct action from the save above. */}
            {!member.userId && (
              <div className="team-invite-block">
                <p className="card__text">
                  {member.hasPendingInvite ? t.team.inviteAlreadySent : t.team.noInviteSentYet}
                </p>
                {editEmail !== (member.email ?? '') && (
                  <p className="team-switch-desc">{t.team.emailChangedHint}</p>
                )}
                {inviteError && <Alert variant="danger">{inviteError}</Alert>}
                {inviteSuccess && <Alert variant="success">{inviteSuccess}</Alert>}
                <div className="team-invite-actions">
                  <button
                    className={`btn${invitePending ? ' is-loading' : ''}`}
                    onClick={handleSendInvite}
                    aria-busy={invitePending}
                    disabled={!member.email || editEmail !== (member.email ?? '')}
                    title={!member.email ? t.team.addEmailFirst : undefined}
                  >
                    {member.hasPendingInvite ? t.team.resendInvite : t.team.sendInvite}
                  </button>
                  {member.hasPendingInvite && (
                    <button className="btn btn--secondary" onClick={handleCancelInvite} disabled={invitePending}>
                      {t.team.cancelInvite}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="team-date">{member.email}</p>
        )}
      </div>

      {/* Staff availability schedule */}
      {workingHoursApi && (
        <div className="team-member-schedules">
          <h2>{t.team.availability}</h2>
          <WorkingHoursPanel api={workingHoursApi} isOwner={isOwner} />
        </div>
      )}

      {/* Assigned services */}
      <div className="card">
        <h2 className="card__title">{t.team.assignedServices}</h2>
        {servicesLoading ? (
          <div className="shops-spinner-wrap">
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <>
            {servicesError && <Alert variant="danger">{servicesError}</Alert>}
            {memberServices.length === 0 ? (
              <p className="team-services-empty">{t.team.noAssignedServices}</p>
            ) : (
              <ul className="service-staff-list">
                {memberServices.map((a) => (
                  <li key={a.serviceId} className="service-staff-item">
                    <span>{a.service.name}</span>
                    {isOwner && (
                      <button
                        className="btn btn--secondary btn--sm service-action-btn"
                        onClick={() => handleUnassignService(a.serviceId)}
                        disabled={unassigningServiceId === a.serviceId}
                      >
                        {unassigningServiceId === a.serviceId ? '...' : t.team.removeService}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isOwner && (() => {
              const assignedIds = new Set(memberServices.map((a) => a.serviceId));
              const available = allServices.filter((s) => !assignedIds.has(s.id));
              if (available.length === 0) return null;
              return (
                <div className="service-staff-add">
                  <div className="select-wrap select-wrap--sm service-staff-select"><select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="select select--sm"
                    aria-label={t.team.selectService}
                  >
                    <option value="">{t.team.selectService}</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select></div>
                  <button
                    className="btn btn--sm service-action-btn"
                    onClick={handleAssignService}
                    disabled={!selectedServiceId || assigningService}
                  >
                    {assigningService ? t.team.assigningService : t.team.assignService}
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Danger zone — owner only */}
      {isOwner && (
        <div className="card card--danger shop-danger-card">
          <h2 className="card__title">{t.team.dangerZone}</h2>
          <p className="card__text">{t.team.removeMemberDesc}</p>
          {removeError && <Alert variant="danger">{removeError}</Alert>}
          <button className="btn btn--danger btn--block" onClick={() => setConfirmRemove(true)}>
            {t.team.remove}
          </button>
        </div>
      )}

      {confirmRoleChange && member && (
        <ConfirmDialog
          tone="warning"
          title={(editRole === 'owner' ? t.team.promoteTitle : t.team.demoteTitle).replace('{name}', member.name)}
          message={editRole === 'owner' ? t.team.confirmPromoteOwner : t.team.confirmDemoteOwner}
          confirmLabel={editRole === 'owner' ? t.team.promoteConfirmButton : t.team.demoteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={savingMember}
          onConfirm={saveMemberChange}
          onCancel={() => setConfirmRoleChange(false)}
        />
      )}

      {confirmRemove && member && (
        <ConfirmDialog
          tone="danger"
          title={t.team.removeTitle.replace('{name}', member.name)}
          message={t.team.confirmRemovePrompt}
          confirmLabel={t.team.removeConfirmButton}
          cancelLabel={t.team.cancel}
          busy={removing}
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
}
