import { useEffect, useState } from 'react';
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

export default function ShopTeamMemberPage() {
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
      editEmail !== (member.email ?? ''));
  const isOwnerChange = !!member && editRole !== member.role && (editRole === 'owner' || member.role === 'owner');

  const saveMemberChange = async () => {
    if (!shop || !memberId || !member) return;
    setSavingMember(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      const dto: { role: 'owner' | 'staff'; canViewCustomerDetails: boolean; email?: string } = {
        role: editRole,
        canViewCustomerDetails: editCanView,
      };
      if (editEmail !== (member.email ?? '')) dto.email = editEmail;
      const updated = await updateMemberRole(shop.id, memberId, dto);
      setMember(updated);
      setMemberSuccess(t.team.roleUpdated);
      setConfirmRoleChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && (err as { response?: { data?: { message?: string } } }).response?.data?.message;
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
      setRemoveError(t.team.errorRemove);
      setRemoving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!shop || !memberId) return;
    setInvitePending(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const updated = await sendLoginInvite(shop.id, memberId);
      setMember(updated);
      setInviteSuccess(t.team.inviteSent);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setInviteError(msg || t.team.errorSendInvite);
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
        <div className="alert alert-error">{error || t.team.notFound}</div>
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
        <h1>{member.name}</h1>
        <div className="team-member-meta">
          <span className={`team-role-badge team-role-${member.role}`}>
            {t.team.roles[member.role]}
          </span>
          <span className="team-date">
            {t.team.joined}: {new Date(member.createdAt).toLocaleDateString()}
          </span>
        </div>

        {isOwner ? (
          <>
            <div className="form-group">
              <label>{t.team.emailLabel}</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="staff@example.com"
                disabled={savingMember}
              />
            </div>

            <div className="form-group">
              <label>{t.team.role}</label>
              <select
                value={editRole}
                onChange={(e) => { setEditRole(e.target.value as 'owner' | 'staff'); setConfirmRoleChange(false); }}
              >
                <option value="staff">{t.team.roles.staff}</option>
                <option value="owner">{t.team.roles.owner}</option>
              </select>
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

            {memberError && <div className="alert alert-error">{memberError}</div>}
            {memberSuccess && <div className="alert alert-success">{memberSuccess}</div>}
            {confirmRoleChange && (
              <div className="alert alert-error">
                {editRole === 'owner' ? t.team.confirmPromoteOwner : t.team.confirmDemoteOwner}
              </div>
            )}

            <div className="team-invite-actions">
              <button
                className="btn btn-primary"
                onClick={handleSaveMember}
                disabled={savingMember || !isMemberDirty}
              >
                {savingMember ? t.team.saving : confirmRoleChange ? t.team.confirmContinue : t.team.saveRole}
              </button>
              {confirmRoleChange && (
                <button className="btn btn-ghost" onClick={() => setConfirmRoleChange(false)}>
                  {t.team.cancel}
                </button>
              )}
            </div>

            {/* Login invite — only relevant until they accept and get a login;
                sends an email, so it stays a distinct action from the save above. */}
            {!member.userId && (
              <div className="team-invite-block">
                <p className="shop-danger-desc">
                  {member.hasPendingInvite ? t.team.inviteAlreadySent : t.team.noInviteSentYet}
                </p>
                {editEmail !== (member.email ?? '') && (
                  <p className="team-switch-desc">{t.team.emailChangedHint}</p>
                )}
                {inviteError && <div className="alert alert-error">{inviteError}</div>}
                {inviteSuccess && <div className="alert alert-success">{inviteSuccess}</div>}
                <div className="team-invite-actions">
                  <button
                    className="btn btn-primary"
                    onClick={handleSendInvite}
                    disabled={invitePending || !member.email || editEmail !== (member.email ?? '')}
                    title={!member.email ? t.team.addEmailFirst : undefined}
                  >
                    {invitePending ? t.team.saving : member.hasPendingInvite ? t.team.resendInvite : t.team.sendInvite}
                  </button>
                  {member.hasPendingInvite && (
                    <button className="btn btn-ghost" onClick={handleCancelInvite} disabled={invitePending}>
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
      <div className="card team-services-card">
        <h2>{t.team.assignedServices}</h2>
        {servicesLoading ? (
          <div className="shops-spinner-wrap">
            <div className="spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : (
          <>
            {servicesError && <div className="alert alert-error">{servicesError}</div>}
            {memberServices.length === 0 ? (
              <p className="team-services-empty">{t.team.noAssignedServices}</p>
            ) : (
              <ul className="service-staff-list">
                {memberServices.map((a) => (
                  <li key={a.serviceId} className="service-staff-item">
                    <span>{a.service.name}</span>
                    {isOwner && (
                      <button
                        className="btn btn-ghost service-action-btn"
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
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="service-staff-select"
                  >
                    <option value="">{t.team.selectService}</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary service-action-btn"
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
        <div className="card shop-danger-card">
          <h2 className="shop-danger-title">{t.team.dangerZone}</h2>
          <p className="shop-danger-desc">{t.team.removeMemberDesc}</p>
          {removeError && <div className="alert alert-error">{removeError}</div>}
          {!confirmRemove ? (
            <button className="btn btn-danger" onClick={() => setConfirmRemove(true)}>
              {t.team.remove}
            </button>
          ) : (
            <div className="wh-delete-confirm">
              <span className="wh-delete-confirm-text">{t.team.confirmRemovePrompt}</span>
              <button
                className="btn btn-danger"
                onClick={handleRemove}
                disabled={removing}
              >
                {removing ? t.team.removing : t.team.remove}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmRemove(false)}
              >
                {t.team.cancel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
