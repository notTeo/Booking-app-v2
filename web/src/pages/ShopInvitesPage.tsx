import { useEffect, useState } from 'react';
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

export default function ShopInvitesPage() {
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
    if (!shop) return;
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
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t.invites.errorSend;
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
    if (!shop) return;
    setActionPendingId(memberId);
    setActionError('');
    try {
      const updated = await sendLoginInvite(shop.id, memberId);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch {
      setActionError(t.invites.errorResend);
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

      {error && <div className="alert alert-error">{error}</div>}

      {/* Add team member form */}
      <div className="invites-form-card">
        <h2>{t.invites.addMember}</h2>
        <form onSubmit={handleSend}>
          <div className="invites-form-row">
            <div className="form-group">
              <label>{t.invites.nameLabel}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.invites.namePlaceholder}
                required
                disabled={sending}
              />
            </div>
            <div className="form-group">
              <label>{t.invites.emailLabel}{!sendEmail && ` (${t.invites.optional})`}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required={sendEmail}
                disabled={sending}
              />
            </div>
            <div className="form-group">
              <label>{t.invites.roleLabel}</label>
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value as ShopRole); setConfirmOwner(false); }}
                disabled={sending}
              >
                <option value="staff">{t.invites.roles.staff}</option>
                <option value="owner">{t.invites.roles.owner}</option>
              </select>
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

          {confirmOwner && (
            <div className="alert alert-error">{t.invites.confirmOwnerInvite}</div>
          )}

          <div className="invites-form-row">
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? t.invites.sending : confirmOwner ? t.team.confirmContinue : t.invites.addMember}
            </button>
            {confirmOwner && (
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmOwner(false)}>
                {t.team.cancel}
              </button>
            )}
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
      {pendingMembers.length === 0 ? (
        <p className="invites-empty">{t.invites.noPendingLogins}</p>
      ) : (
        <>
          {actionError && <div className="alert alert-error">{actionError}</div>}
          {/* Desktop / tablet: table (hidden below 640px) */}
          <div className="data-table-card table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.invites.nameLabel}</th>
                  <th>{t.invites.emailLabel}</th>
                  <th>{t.invites.roleLabel}</th>
                  <th>{t.invites.statusLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map((m) => (
                  <tr key={m.id} className="data-table-row">
                    <td>{m.name}</td>
                    <td>{m.email ?? '—'}</td>
                    <td>
                      <span className={`invite-role-badge ${m.role === 'owner' ? 'invite-role-owner' : ''}`}>
                        {t.invites.roles[m.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`invite-status-badge invite-status-${m.hasPendingInvite ? 'pending' : 'expired'}`}>
                        {m.hasPendingInvite ? t.invites.status.pending : t.invites.notSentYet}
                      </span>
                    </td>
                    <td>
                      <div className="invite-actions">
                        <button
                          className="btn btn-ghost"
                          onClick={() => handleResend(m.id)}
                          disabled={actionPendingId === m.id}
                        >
                          {actionPendingId === m.id ? t.invites.sending : m.hasPendingInvite ? t.invites.resend : t.invites.sendInvite}
                        </button>
                        {m.hasPendingInvite && (
                          confirmCancel === m.id ? (
                            <>
                              <button
                                className="btn btn-danger"
                                onClick={() => handleCancelInvite(m.id)}
                                disabled={actionPendingId === m.id}
                              >
                                {t.invites.confirmCancel}
                              </button>
                              <button className="btn btn-ghost" onClick={() => setConfirmCancel(null)}>
                                {t.team.cancel}
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-ghost" onClick={() => setConfirmCancel(m.id)}>
                              {t.invites.cancelInvite}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards (hidden at 640px and above) */}
          <div className="row-cards card-view">
            {pendingMembers.map((m) => (
              <div key={m.id} className="row-card row-card--static">
                <div className="row-card__field">
                  <span className="row-card__label">{t.invites.nameLabel}</span>
                  <span className="row-card__value">{m.name}</span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.invites.emailLabel}</span>
                  <span className="row-card__value">{m.email ?? '—'}</span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.invites.roleLabel}</span>
                  <span className={`invite-role-badge ${m.role === 'owner' ? 'invite-role-owner' : ''}`}>
                    {t.invites.roles[m.role]}
                  </span>
                </div>
                <div className="row-card__field">
                  <span className="row-card__label">{t.invites.statusLabel}</span>
                  <span className={`invite-status-badge invite-status-${m.hasPendingInvite ? 'pending' : 'expired'}`}>
                    {m.hasPendingInvite ? t.invites.status.pending : t.invites.notSentYet}
                  </span>
                </div>
                <div className="row-card__actions">
                  <button
                    className="btn btn-ghost"
                    onClick={() => handleResend(m.id)}
                    disabled={actionPendingId === m.id}
                  >
                    {actionPendingId === m.id ? t.invites.sending : m.hasPendingInvite ? t.invites.resend : t.invites.sendInvite}
                  </button>
                  {m.hasPendingInvite && (
                    confirmCancel === m.id ? (
                      <>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleCancelInvite(m.id)}
                          disabled={actionPendingId === m.id}
                        >
                          {t.invites.confirmCancel}
                        </button>
                        <button className="btn btn-ghost" onClick={() => setConfirmCancel(null)}>
                          {t.team.cancel}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" onClick={() => setConfirmCancel(m.id)}>
                        {t.invites.cancelInvite}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
