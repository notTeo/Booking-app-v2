import { useEffect, useState } from 'react';
import { canManageShop, ROLE_BADGE } from '../utils/roles';
import { Link, useNavigate } from 'react-router-dom';
import { handleRowClick } from '../utils/a11y';
import { isReferencedConflict } from '../utils/apiError';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getMembers, removeMember, sendLoginInvite, cancelLoginInvite, type TeamMember } from '../api/team.api';
import '../styles/pages/team.css';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import ConfirmDialog from '../components/ConfirmDialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faLock } from '@fortawesome/free-solid-svg-icons';
import AddMemberModal from '../components/AddMemberModal';
import { planErrorMessage, staffLimitText } from '../utils/plan';

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Private mode or blocked storage: it is hidden until the page is reloaded.
  }
};

export default function ShopTeamPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addFeedback, setAddFeedback] = useState('');
  const [invitePendingId, setInvitePendingId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [confirmCancelInvite, setConfirmCancelInvite] = useState<string | null>(null);

  const canManage = canManageShop(shop?.role);
  // Members who can be booked take the plan's staff places.
  const staffUsed = members.filter((m) => m.active && (m.bookableByCustomers || m.bookableInternally)).length;
  const atStaffLimit = !!shop && staffUsed >= shop.staffLimit;
  // The note about the Team plan can be put away; it stays away for this shop on this device.
  const noteKey = `team-plan-note-hidden-${shop?.id}`;
  const [noteHidden, setNoteHidden] = useState(() => readFlag(noteKey));
  const hideNote = () => {
    writeFlag(noteKey);
    setNoteHidden(true);
  };

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    getMembers(shop.id)
      .then(setMembers)
      .catch(() => setError(t.team.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id]);

  const handleRemove = async (memberId: string) => {
    if (!shop) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await removeMember(shop.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setConfirmRemove(null);
    } catch (err) {
      setConfirmRemove(null);
      setRemoveError(isReferencedConflict(err) ? t.team.errorRemoveHasBookings : t.team.errorRemove);
    } finally {
      setRemoving(false);
    }
  };

  const handleResend = async (memberId: string) => {
    if (!shop || invitePendingId === memberId) return;
    setInvitePendingId(memberId);
    setInviteError('');
    try {
      const updated = await sendLoginInvite(shop.id, memberId);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      setInviteError(code === 'MEMBER_INACTIVE' ? t.team.errorInviteInactive : planErrorMessage(err, t.shopPlan) ?? t.invites.errorResend);
    } finally {
      setInvitePendingId(null);
    }
  };

  const handleCancelInvite = async (memberId: string) => {
    if (!shop) return;
    setInvitePendingId(memberId);
    setInviteError('');
    try {
      const updated = await cancelLoginInvite(shop.id, memberId);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setConfirmCancelInvite(null);
    } catch {
      setConfirmCancelInvite(null);
      setInviteError(t.invites.errorCancel);
    } finally {
      setInvitePendingId(null);
    }
  };

  // Shared between the table row's actions cell and the mobile card's
  // actions row. The confirm dialog is rendered once, at the bottom.
  const renderActions = (member: TeamMember) => {
    // Managers are managed by the owner, or by a manager the owner allows.
    if (member.role === 'manager' && !shop?.canManageManagers) return null;
    const resending = invitePendingId === member.id && confirmCancelInvite !== member.id;
    return (
      <div className="cluster cluster--tight">
        {!member.userId && shop?.teamFeatures && (
          <>
            <button
              className={`btn btn--secondary btn--sm${resending ? ' is-loading' : ''}`}
              onClick={() => handleResend(member.id)}
              aria-busy={resending}
            >
              {member.hasPendingInvite ? t.invites.resend : t.invites.sendInvite}
            </button>
            {member.hasPendingInvite && (
              <button className="btn btn--danger-outline btn--sm" onClick={() => setConfirmCancelInvite(member.id)}>
                {t.invites.cancelInvite}
              </button>
            )}
          </>
        )}
        {/* The owner is never removed: they transfer the shop or delete it. */}
        {member.role !== 'owner' && (
          <button
            className="btn btn--danger-outline btn--sm"
            onClick={() => {
              setConfirmRemove(member.id);
              setRemoveError('');
            }}
          >
            {t.team.remove}
          </button>
        )}
      </div>
    );
  };

  if (shopLoading || loading) {
    return (
      <div className="team-page">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="page-header">
        <h1 className="t-title">{t.team.title}</h1>
        {canManage && (
          <button type="button" className="btn btn--sm" disabled={atStaffLimit} onClick={() => { setShowAdd(true); setAddFeedback(''); }}>
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {t.invites.addMember}
          </button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {shop?.role === 'owner' && !shop.teamFeatures && !shop.locked && !noteHidden && (
        <Alert
          variant="info"
          title={t.onboarding.solo.teamTitle}
          onClose={hideNote}
          closeLabel={t.customerProfile.close}
          actions={
            <>
              <Link to={`/shops/${shop.slug}/settings?tab=plan`} className="btn btn--sm">{t.onboarding.solo.upgrade}</Link>
              <Link to="/pricing" className="btn btn--ghost btn--sm">{t.onboarding.solo.comparePlans}</Link>
            </>
          }
        >
          {t.onboarding.solo.teamText}
        </Alert>
      )}
      {canManage && shop && atStaffLimit && shop.teamFeatures && (
        <Alert variant="info" actions={<Link to="/contact" className="btn btn--secondary btn--sm">{t.shopPlan.contactUs}</Link>}>
          {staffLimitText(t.shopPlan, shop.plan, shop.staffLimit)}
        </Alert>
      )}
      {addFeedback && <Alert variant="success">{addFeedback}</Alert>}
      {inviteError && <Alert variant="danger">{inviteError}</Alert>}

      <div className="table-wrap">
        <div className="table-surface">
          {members.length === 0 ? (
            <div className="empty empty--sm">
              <p className="empty__text">{t.team.noMembers}</p>
            </div>
          ) : (
            <table className="data-table" role="table">
              <thead>
                <tr role="row">
                  <th scope="col" role="columnheader">{t.team.email}</th>
                  <th scope="col" role="columnheader">{t.team.role}</th>
                  <th scope="col" role="columnheader">{t.team.joined}</th>
                  {canManage && <th scope="col" role="columnheader">{t.team.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} role="row" className="is-clickable" onClick={handleRowClick(() => navigate(member.id))}>
                    <td role="cell" data-label={t.team.email} className="data-table__title">
                      <span className="data-table__identity">
                        <Avatar name={member.name} photoUrl={member.photoUrl} size="sm" />
                        <Link to={member.id} className="data-table__link">{member.email ?? member.name}</Link>
                      </span>
                      {!member.userId && (
                        <>
                          <span className="badge badge--warning">{t.team.noLoginYet}</span>
                          <span className="badge badge--neutral">
                            {member.hasPendingInvite ? t.invites.status.pending : t.invites.notSentYet}
                          </span>
                        </>
                      )}
                    </td>
                    <td role="cell" data-label={t.team.role}>
                      <span className={`badge ${ROLE_BADGE[member.role]}`}>
                        {t.team.roles[member.role]}
                      </span>
                      {!member.active && (
                        <span className="badge badge--neutral">{t.team.inactiveBadge}</span>
                      )}
                      {/* Switched off because the plan has no place for them: back on once it does. */}
                      {!member.active && atStaffLimit && (
                        <span className="badge badge--warning">
                          <FontAwesomeIcon icon={faLock} aria-hidden="true" />
                          {t.onboarding.solo.lockedByPlan}
                        </span>
                      )}
                    </td>
                    <td role="cell" data-label={t.team.joined}>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {canManage && (
                      <td
                        role="cell"
                        data-label=""
                        className="data-table__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {renderActions(member)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {removeError && <Alert variant="danger">{removeError}</Alert>}

      {showAdd && shop && (
        <AddMemberModal
          canAddManager={!!shop.canManageManagers}
          plan={shop.plan}
          teamFeatures={shop.teamFeatures}
          shopId={shop.id}
          onCreated={(member, emailSent) => {
            setMembers((prev) => [member, ...prev]);
            setAddFeedback(emailSent ? t.invites.sentOk : t.invites.createdNoEmail);
            setShowAdd(false);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {confirmCancelInvite && (
        <ConfirmDialog
          tone="danger"
          title={t.invites.cancelInviteTitle.replace('{name}', members.find((m) => m.id === confirmCancelInvite)?.name ?? '')}
          message={t.invites.cancelInviteMessage}
          confirmLabel={t.invites.cancelInviteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={invitePendingId === confirmCancelInvite}
          onConfirm={() => handleCancelInvite(confirmCancelInvite)}
          onCancel={() => setConfirmCancelInvite(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          tone="danger"
          title={t.team.removeTitle.replace('{name}', members.find((m) => m.id === confirmRemove)?.name ?? '')}
          message={t.team.confirmRemovePrompt}
          confirmLabel={t.team.removeConfirmButton}
          cancelLabel={t.team.cancel}
          busy={removing}
          onConfirm={() => handleRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}
