import { useEffect, useState, useId } from 'react';
import { canManageShop, ROLE_BADGE } from '../utils/roles';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { apiErrorMessage, isReferencedConflict } from '../utils/apiError';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  getMember,
  updateMemberRole,
  setMemberPhoto,
  removeMemberPhoto,
  removeMember,
  sendLoginInvite,
  cancelLoginInvite,
  transferOwnership,
  type ShopRole,
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
import TimeOffPanel from '../components/TimeOffPanel';
import Switch from '../components/Switch';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import PhotoField from '../components/PhotoField';
import ConfirmDialog from '../components/ConfirmDialog';
import { planErrorMessage } from '../utils/plan';

export default function ShopTeamMemberPage() {
  const uid = useId();
  const { slug, memberId } = useParams<{ slug: string; memberId: string }>();
  const { shop, isLoading: shopLoading, refetch: refetchShop } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Member & Access — name/role/email/permissions, saved together
  const [editRole, setEditRole] = useState<ShopRole>('staff');
  const [editCanView, setEditCanView] = useState(true);
  const [editCanManageManagers, setEditCanManageManagers] = useState(false);
  const [editCanEditSettings, setEditCanEditSettings] = useState(false);
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

  // Transfer ownership — the owner hands the shop to this manager
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

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

  const canManage = canManageShop(shop?.role);
  const viewerIsOwner = shop?.role === 'owner';
  const memberIsOwner = member?.role === 'owner';
  // A shop has one owner, so an owner looking at the owner's row is looking at
  // their own. Managers see it read-only.
  // …and so do managers looking at another manager, unless the owner lets
  // them manage managers.
  const memberIsManager = member?.role === 'manager';
  const canEdit =
    canManage && (!memberIsOwner || viewerIsOwner) && (!memberIsManager || !!shop?.canManageManagers);
  const canTransfer = viewerIsOwner && member?.role === 'manager' && member.active && !!member.userId;

  useEffect(() => {
    if (!shop || !memberId) return;
    setLoading(true);
    getMember(shop.id, memberId)
      .then((m) => {
        setMember(m);
        setEditRole(m.role);
        setEditCanView(m.canViewCustomerDetails);
        setEditCanManageManagers(m.canManageManagers);
        setEditCanEditSettings(m.canEditShopSettings);
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
      editCanManageManagers !== member.canManageManagers ||
      editCanEditSettings !== member.canEditShopSettings ||
      editEmail !== (member.email ?? '') ||
      editActive !== member.active ||
      editBookableByCustomers !== member.bookableByCustomers ||
      editBookableInternally !== member.bookableInternally);
  const isManagerChange = !!member && editRole !== member.role && (editRole === 'manager' || member.role === 'manager');

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

  const handleRoleChange = (role: ShopRole) => {
    setEditRole(role);
    setConfirmRoleChange(false);
  };

  const saveMemberChange = async () => {
    if (!shop || !memberId || !member || savingMember) return;
    setSavingMember(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      const dto: {
        role: ShopRole;
        canViewCustomerDetails: boolean;
        canManageManagers?: boolean;
        canEditShopSettings?: boolean;
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
      // A manager's permissions are the owner's to set.
      if (viewerIsOwner && editRole === 'manager') {
        dto.canManageManagers = editCanManageManagers;
        dto.canEditShopSettings = editCanEditSettings;
      }
      if (editEmail !== (member.email ?? '')) dto.email = editEmail;
      const updated = await updateMemberRole(shop.id, memberId, dto);
      setMember(updated);
      // Show what the server stored, not the local toggles — e.g. reactivating
      // turns both bookable flags back on server-side.
      setEditRole(updated.role);
      setEditCanView(updated.canViewCustomerDetails);
      setEditCanManageManagers(updated.canManageManagers);
      setEditCanEditSettings(updated.canEditShopSettings);
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
      setMemberError(planErrorMessage(err, t.shopPlan) ?? (msg || t.team.errorUpdateRole));
    } finally {
      setSavingMember(false);
    }
  };

  const handleSaveMember = () => {
    if (isManagerChange && !confirmRoleChange) {
      setConfirmRoleChange(true);
      return;
    }
    saveMemberChange();
  };

  const handleTransfer = async () => {
    if (!shop || !memberId || transferring) return;
    setTransferring(true);
    setTransferError('');
    try {
      const updated = await transferOwnership(shop.id, memberId);
      setMember(updated);
      setEditRole(updated.role);
      setConfirmTransfer(false);
      // The viewer is a manager now: reload the shop so every gate follows.
      refetchShop();
    } catch (err: unknown) {
      setConfirmTransfer(false);
      setTransferError(apiErrorMessage(err, t.team.errorTransfer));
    } finally {
      setTransferring(false);
    }
  };

  const handleRemove = async () => {
    if (!shop || !memberId) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await removeMember(shop.id, memberId);
      navigate(`/shops/${slug}/team`);
    } catch (err) {
      setConfirmRemove(false);
      setRemoveError(isReferencedConflict(err) ? t.team.errorRemoveHasBookings : t.team.errorRemove);
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
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="team-member-page">
        <div className="cluster">
          <Link className="btn btn--secondary btn--sm" to={`/shops/${slug}/team`}>
            <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
            {t.team.backToTeam}
          </Link>
        </div>
        <Alert variant="danger">{error || t.team.notFound}</Alert>
      </div>
    );
  }

  return (
    <div className="team-member-page">
      {/* Back link */}
      <div className="cluster">
        <Link className="btn btn--secondary btn--sm" to={`/shops/${slug}/team`}>
          <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
          {t.team.backToTeam}
        </Link>
      </div>

      {/* Member & Access — identity, role/permissions, and login invite, one save */}
      <div className="card team-member-card">
        <PhotoField
          photo={member}
          shape="round"
          canEdit={canEdit}
          preview={<Avatar name={member.name} photoUrl={member.photoUrl} size="xl" />}
          onUpload={async (file, crop) => setMember(await setMemberPhoto(shop!.id, member.id, file, crop))}
          onRemove={async () => setMember(await removeMemberPhoto(shop!.id, member.id))}
        >
          <h1 className="t-heading">{member.name}</h1>
          <div className="cluster">
            <span className={`badge ${ROLE_BADGE[member.role]}`}>
              {t.team.roles[member.role]}
            </span>
            <span className="t-body-sm t-muted">
              {t.team.joined}: {new Date(member.createdAt).toLocaleDateString()}
            </span>
          </div>
        </PhotoField>

        {canEdit ? (
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

            {/* The owner's role only changes by transferring the shop. */}
            {!memberIsOwner && (
              <div className="field">
                <label className="field__label" htmlFor={`${uid}-role`}>{t.team.role}</label>
                <div className="select-wrap"><select id={`${uid}-role`} className="select"
                  value={editRole}
                  onChange={(e) => handleRoleChange(e.target.value as ShopRole)}
                >
                  <option value="staff">{t.team.roles.staff}</option>
                  {shop?.canManageManagers && (shop.teamFeatures || memberIsManager) && <option value="manager">{t.team.roles.manager}</option>}
                </select></div>
              </div>
            )}

            <div className="setting-row">
              <div className="setting-row__label">
                <span className="setting-row__title">{t.team.active}</span>
                <span className="setting-row__text">
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

            <div className="setting-row">
              <div className="setting-row__label">
                <span className="setting-row__title">{t.team.bookableByCustomers}</span>
                <span className="setting-row__text">{t.team.bookableByCustomersDesc}</span>
              </div>
              <Switch
                checked={editBookableByCustomers}
                onChange={setEditBookableByCustomers}
                label={t.team.bookableByCustomers}
                disabled={!editActive}
              />
            </div>

            <div className="setting-row">
              <div className="setting-row__label">
                <span className="setting-row__title">{t.team.bookableInternally}</span>
                <span className="setting-row__text">{t.team.bookableInternallyDesc}</span>
              </div>
              <Switch
                checked={editBookableInternally}
                onChange={setEditBookableInternally}
                label={t.team.bookableInternally}
                disabled={!editActive}
              />
            </div>

            {editRole === 'staff' && (
              <div className="setting-row">
                <div className="setting-row__label">
                  <span className="setting-row__title">{t.team.canViewCustomerDetails}</span>
                  <span className="setting-row__text">{t.team.canViewCustomerDetailsDesc}</span>
                </div>
                <Switch checked={editCanView} onChange={setEditCanView} label={t.team.canViewCustomerDetails} />
              </div>
            )}

            {/* What this manager may do beyond the day-to-day — the owner decides. */}
            {viewerIsOwner && editRole === 'manager' && (
              <>
                <div className="setting-row">
                  <div className="setting-row__label">
                    <span className="setting-row__title">{t.team.canManageManagers}</span>
                    <span className="setting-row__text">{t.team.canManageManagersDesc}</span>
                  </div>
                  <Switch
                    checked={editCanManageManagers}
                    onChange={setEditCanManageManagers}
                    label={t.team.canManageManagers}
                  />
                </div>
                <div className="setting-row">
                  <div className="setting-row__label">
                    <span className="setting-row__title">{t.team.canEditShopSettings}</span>
                    <span className="setting-row__text">{t.team.canEditShopSettingsDesc}</span>
                  </div>
                  <Switch
                    checked={editCanEditSettings}
                    onChange={setEditCanEditSettings}
                    label={t.team.canEditShopSettings}
                  />
                </div>
              </>
            )}

            {memberError && <Alert variant="danger">{memberError}</Alert>}
            {memberSuccess && <Alert variant="success">{memberSuccess}</Alert>}
            <div className="cluster">
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
            {!member.userId && shop?.teamFeatures && (
              <div className="card__section">
                <p className="card__text">
                  {member.hasPendingInvite ? t.team.inviteAlreadySent : t.team.noInviteSentYet}
                </p>
                {editEmail !== (member.email ?? '') && (
                  <p className="card__text">{t.team.emailChangedHint}</p>
                )}
                {inviteError && <Alert variant="danger">{inviteError}</Alert>}
                {inviteSuccess && <Alert variant="success">{inviteSuccess}</Alert>}
                <div className="cluster">
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
                    <button className="btn btn--danger-outline" onClick={handleCancelInvite} disabled={invitePending}>
                      {t.team.cancelInvite}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="card__text">{member.email}</p>
        )}
      </div>

      {/* Staff availability schedule */}
      {workingHoursApi && (
        <WorkingHoursPanel api={workingHoursApi} canManage={canManage} title={t.team.availability} />
      )}

      {/* Days and hours off, on top of the schedule */}
      {shop && memberId && (
        <TimeOffPanel
          shopId={shop.id}
          memberId={memberId}
          canManage={canManage}
          calendarPath={`/shops/${slug}/bookings`}
        />
      )}

      {/* Assigned services */}
      <div className="card">
        <h2 className="card__title">{t.team.assignedServices}</h2>
        {servicesLoading ? (
          <div className="spinner-wrap">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {servicesError && <Alert variant="danger">{servicesError}</Alert>}
            {memberServices.length === 0 ? (
              <p className="card__text">{t.team.noAssignedServices}</p>
            ) : (
              <ul className="list">
                {memberServices.map((a) => (
                  <li key={a.serviceId} className="list__item">
                    <span>{a.service.name}</span>
                    {canManage && (
                      <button
                        className="btn btn--secondary btn--sm"
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
            {canManage && (() => {
              const assignedIds = new Set(memberServices.map((a) => a.serviceId));
              const available = allServices.filter((s) => !assignedIds.has(s.id));
              if (available.length === 0) return null;
              return (
                <div className="cluster cluster--tight">
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
                    className="btn btn--sm"
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

      {/* Transfer ownership — the owner only, to a manager who can sign in */}
      {canTransfer && (
        <div className="card">
          <h2 className="card__title">{t.team.transferOwnership}</h2>
          <p className="card__text">{t.team.transferDesc}</p>
          {transferError && <Alert variant="danger">{transferError}</Alert>}
          <button className="btn btn--danger-outline" onClick={() => setConfirmTransfer(true)}>
            {t.team.transferOwnership}
          </button>
        </div>
      )}

      {/* Danger zone — never for the owner, who transfers the shop or deletes it */}
      {canEdit && !memberIsOwner && (
        <div className="card card--danger">
          <h2 className="card__title">{t.team.dangerZone}</h2>
          <p className="card__text">{t.team.removeMemberDesc}</p>
          {removeError && <Alert variant="danger">{removeError}</Alert>}
          <button className="btn btn--danger-outline btn--block" onClick={() => setConfirmRemove(true)}>
            {t.team.remove}
          </button>
        </div>
      )}

      {confirmRoleChange && member && (
        <ConfirmDialog
          tone="warning"
          title={(editRole === 'manager' ? t.team.promoteTitle : t.team.demoteTitle).replace('{name}', member.name)}
          message={editRole === 'manager' ? t.team.confirmPromoteManager : t.team.confirmDemoteManager}
          confirmLabel={editRole === 'manager' ? t.team.promoteConfirmButton : t.team.demoteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={savingMember}
          onConfirm={saveMemberChange}
          onCancel={() => setConfirmRoleChange(false)}
        />
      )}

      {confirmTransfer && member && (
        <ConfirmDialog
          tone="danger"
          title={t.team.transferTitle.replace('{name}', member.name)}
          message={t.team.confirmTransfer}
          confirmLabel={t.team.transferConfirmButton}
          cancelLabel={t.team.cancel}
          busy={transferring}
          onConfirm={handleTransfer}
          onCancel={() => setConfirmTransfer(false)}
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
