import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMember, updateMemberRole, removeMember, type TeamMember } from '../api/team.api';
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
import '../styles/pages/team.css';

export default function ShopTeamMemberPage() {
  const { slug, memberId } = useParams<{ slug: string; memberId: string }>();
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Role edit
  const [editRole, setEditRole] = useState<'owner' | 'staff'>('staff');
  const [savingRole, setSavingRole] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState('');
  const [roleError, setRoleError] = useState('');

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

  const handleSaveRole = async () => {
    if (!shop || !memberId) return;
    setSavingRole(true);
    setRoleError('');
    setRoleSuccess('');
    try {
      const updated = await updateMemberRole(shop.id, memberId, { role: editRole });
      setMember(updated);
      setRoleSuccess(t.team.roleUpdated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setRoleError(msg || t.team.errorUpdateRole);
    } finally {
      setSavingRole(false);
    }
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
          ← {t.team.backToTeam}
        </button>
        <div className="alert alert-error">{error || t.team.notFound}</div>
      </div>
    );
  }

  return (
    <div className="team-member-page">
      {/* Back link */}
      <button className="card-back" onClick={() => navigate(`/shops/${slug}/team`)}>
        ← {t.team.backToTeam}
      </button>

      {/* Member info card */}
      <div className="card team-member-card">
        <h1>{member.user.email}</h1>
        <div className="team-member-meta">
          <span className={`team-role-badge team-role-${member.role}`}>
            {t.team.roles[member.role]}
          </span>
          <span className="team-date">
            {t.team.joined}: {new Date(member.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Role editor — owner only */}
      {isOwner && (
        <div className="card team-role-card">
          <h2>{t.team.editRole}</h2>
          <div className="form-group">
            <label>{t.team.role}</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as 'owner' | 'staff')}
            >
              <option value="staff">{t.team.roles.staff}</option>
              <option value="owner">{t.team.roles.owner}</option>
            </select>
          </div>
          {roleError && <div className="alert alert-error">{roleError}</div>}
          {roleSuccess && <div className="alert alert-success">{roleSuccess}</div>}
          <button
            className="btn btn-primary"
            onClick={handleSaveRole}
            disabled={savingRole || editRole === member.role}
          >
            {savingRole ? t.team.saving : t.team.saveRole}
          </button>
        </div>
      )}

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
