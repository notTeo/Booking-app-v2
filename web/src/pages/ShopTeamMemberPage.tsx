import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMember, updateMemberRole, removeMember, type TeamMember } from '../api/team.api';
import * as whApi from '../api/workingHours.api';
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
