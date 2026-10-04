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
import ConfirmDialog from '../components/ConfirmDialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import AddMemberModal from '../components/AddMemberModal';

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
      setInviteError(code === 'MEMBER_INACTIVE' ? t.team.errorInviteInactive : t.invites.errorResend);
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
        {!member.userId && (
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
          <button type="button" className="btn btn--sm" onClick={() => { setShowAdd(true); setAddFeedback(''); }}>
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {t.invites.addMember}
          </button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
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
                      <Link to={member.id} className="data-table__link">{member.email ?? member.name}</Link>
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
