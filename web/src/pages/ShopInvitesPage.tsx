import { useEffect, useState, useId } from 'react';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  getMembers,
  createTeamMember,
  sendLoginInvite,
  cancelLoginInvite,
  type TeamMember,
  type ShopRole,
} from '../api/team.api';
import Switch from '../components/Switch';
import '../styles/pages/invites.css';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ShopInvitesPage() {
  const uid = useId();
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShopRole>('staff');
  const [canViewCustomerDetails, setCanViewCustomerDetails] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [confirmOwner, setConfirmOwner] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const isOwner = shop?.role === 'owner';

  const loadMembers = () => {
    if (!shop) return;
    setLoading(true);
    getMembers(shop.id)
      .then(setMembers)
      .catch(() => setError(t.invites.errorLoad))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!shop || !isOwner) return;
    loadMembers();
  }, [shop?.id]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('staff');
    setCanViewCustomerDetails(true);
    setSendEmail(true);
    setConfirmOwner(false);
  };

  const submitCreate = async () => {
    if (!shop || sending) return;
    setSending(true);
    setSendFeedback(null);
    try {
      const member = await createTeamMember(shop.id, {
        name,
        email: email || undefined,
        role,
        canViewCustomerDetails,
        sendEmail,
      });
      setMembers((prev) => [member, ...prev]);
      resetForm();
      setSendFeedback({ type: 'success', msg: sendEmail ? t.invites.sentOk : t.invites.createdNoEmail });
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, t.invites.errorSend);
      setConfirmOwner(false);
      setSendFeedback({ type: 'error', msg });
    } finally {
      setSending(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'owner' && !confirmOwner) {
      setConfirmOwner(true);
      return;
    }
    submitCreate();
  };

  const pendingMembers = members.filter((m) => !m.userId);

  const handleResend = async (memberId: string) => {
    if (!shop || actionPendingId === memberId) return;
    setActionPendingId(memberId);
    setActionError('');
    try {
      const updated = await sendLoginInvite(shop.id, memberId);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } }).response?.data?.code;
      setActionError(code === 'MEMBER_INACTIVE' ? t.team.errorInviteInactive : t.invites.errorResend);
    } finally {
      setActionPendingId(null);
    }
  };

  const handleCancelInvite = async (memberId: string) => {
    if (!shop) return;
    setActionPendingId(memberId);
    setActionError('');
    try {
      const updated = await cancelLoginInvite(shop.id, memberId);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      setConfirmCancel(null);
    } catch {
      setConfirmCancel(null);
      setActionError(t.invites.errorCancel);
    } finally {
      setActionPendingId(null);
    }
  };

  if (shopLoading || (isOwner && loading)) {
    return (
      <div className="invites-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="invites-page">
        <div className="invites-header"><h1>{t.invites.title}</h1></div>
        <p className="invites-empty">{t.invites.noSent}</p>
      </div>
    );
  }

  return (
    <div className="invites-page">
      <div className="invites-header">
        <h1>{t.invites.title}</h1>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Add team member form */}
      <div className="card">
        <h2 className="card__title">{t.invites.addMember}</h2>
        <form onSubmit={handleSend}>
          <div className="invites-form-row">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-name`}>{t.invites.nameLabel}</label>
              <input id={`${uid}-name`} className="input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.invites.namePlaceholder}
                required
                disabled={sending}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-email`}>{t.invites.emailLabel}{!sendEmail && ` (${t.invites.optional})`}</label>
              <input id={`${uid}-email`} className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required={sendEmail}
                disabled={sending}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-role`}>{t.invites.roleLabel}</label>
              <div className="select-wrap"><select id={`${uid}-role`} className="select"
                value={role}
                onChange={(e) => { setRole(e.target.value as ShopRole); setConfirmOwner(false); }}
                disabled={sending}
              >
                <option value="staff">{t.invites.roles.staff}</option>
                <option value="owner">{t.invites.roles.owner}</option>
              </select></div>
            </div>
          </div>

          {role === 'staff' && (
            <div className="team-switch-row">
              <div className="team-switch-label">
                <span>{t.invites.canViewCustomerDetails}</span>
                <span className="team-switch-desc">{t.invites.canViewCustomerDetailsDesc}</span>
              </div>
              <Switch
                checked={canViewCustomerDetails}
                onChange={setCanViewCustomerDetails}
                label={t.invites.canViewCustomerDetails}
                disabled={sending}
              />
            </div>
          )}

          <div className="team-switch-row">
            <div className="team-switch-label">
              <span>{t.invites.sendEmailNow}</span>
              <span className="team-switch-desc">{t.invites.sendEmailNowDesc}</span>
            </div>
            <Switch checked={sendEmail} onChange={setSendEmail} label={t.invites.sendEmailNow} disabled={sending} />
          </div>

          <div className="invites-form-row">
            <button type="submit" className={`btn btn--block${sending ? ' is-loading' : ''}`} aria-busy={sending}>
              {t.invites.addMember}
            </button>
          </div>
          {sendFeedback && (
            <p className={`invites-form-feedback invites-form-feedback--${sendFeedback.type}`}>
              {sendFeedback.msg}
            </p>
          )}
        </form>
      </div>

      {/* Members without a login yet */}
      <h2 className="invites-subheading">{t.invites.pendingLogins}</h2>
      {actionError && <Alert variant="danger">{actionError}</Alert>}
      <div className="table-wrap">
        <div className="table-surface">
          {pendingMembers.length === 0 ? (
            <div className="empty empty--sm">
              <p className="empty__text">{t.invites.noPendingLogins}</p>
            </div>
          ) : (
            <table className="data-table" role="table">
              <thead>
                <tr role="row">
                  <th scope="col" role="columnheader">{t.invites.nameLabel}</th>
                  <th scope="col" role="columnheader">{t.invites.emailLabel}</th>
                  <th scope="col" role="columnheader">{t.invites.roleLabel}</th>
                  <th scope="col" role="columnheader">{t.invites.statusLabel}</th>
                  <th scope="col" role="columnheader"><span className="visually-hidden">{t.team.actions}</span></th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map((m) => {
                  const resending = actionPendingId === m.id && confirmCancel !== m.id;
                  return (
                  <tr key={m.id} role="row">
                    <td role="cell" data-label={t.invites.nameLabel} className="data-table__title">{m.name}</td>
                    <td role="cell" data-label={t.invites.emailLabel}>{m.email ?? '—'}</td>
                    <td role="cell" data-label={t.invites.roleLabel}>
                      <span className={`badge ${m.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                        {t.invites.roles[m.role]}
                      </span>
                    </td>
                    <td role="cell" data-label={t.invites.statusLabel}>
                      <span className={`badge ${m.hasPendingInvite ? 'badge--warning' : 'badge--neutral'}`}>
                        {m.hasPendingInvite ? t.invites.status.pending : t.invites.notSentYet}
                      </span>
                    </td>
                    <td role="cell" data-label="" className="data-table__actions">
                      <div className="invite-actions">
                        <button
                          className={`btn btn--sm btn--secondary${resending ? ' is-loading' : ''}`}
                          onClick={() => handleResend(m.id)}
                          aria-busy={resending}
                        >
                          {m.hasPendingInvite ? t.invites.resend : t.invites.sendInvite}
                        </button>
                        {m.hasPendingInvite && (
                          <button className="btn btn--sm btn--secondary" onClick={() => setConfirmCancel(m.id)}>
                            {t.invites.cancelInvite}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {confirmOwner && (
        <ConfirmDialog
          tone="warning"
          title={t.invites.ownerInviteTitle.replace('{name}', name)}
          message={t.invites.confirmOwnerInvite}
          confirmLabel={t.invites.ownerInviteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={sending}
          onConfirm={submitCreate}
          onCancel={() => setConfirmOwner(false)}
        />
      )}

      {confirmCancel && (
        <ConfirmDialog
          tone="danger"
          title={t.invites.cancelInviteTitle.replace('{name}', members.find((m) => m.id === confirmCancel)?.name ?? '')}
          message={t.invites.cancelInviteMessage}
          confirmLabel={t.invites.cancelInviteConfirmButton}
          cancelLabel={t.team.cancel}
          busy={actionPendingId === confirmCancel}
          onConfirm={() => handleCancelInvite(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
      )}
    </div>
  );
}
