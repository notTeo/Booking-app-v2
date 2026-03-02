import { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  createInvite,
  getShopInvites,
  revokeInvite,
  type ShopInvite,
  type ShopRole,
} from '../api/invite.api';
import '../styles/pages/invites.css';

export default function ShopInvitesPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();

  const [invites, setInvites] = useState<ShopInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShopRole>('staff');
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const isOwner = shop?.role === 'owner';

  useEffect(() => {
    if (!shop || !isOwner) return;
    setLoading(true);
    getShopInvites(shop.id)
      .then(setInvites)
      .catch(() => setError(t.invites.errorLoad))
      .finally(() => setLoading(false));
  }, [shop?.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setSending(true);
    setSendFeedback(null);
    try {
      const invite = await createInvite(shop.id, { email, role });
      setInvites((prev) => [invite, ...prev]);
      setEmail('');
      setRole('staff');
      setSendFeedback({ type: 'success', msg: t.invites.sentOk });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t.invites.errorSend;
      setSendFeedback({ type: 'error', msg });
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!shop) return;
    setRevoking(true);
    setRevokeError('');
    try {
      await revokeInvite(shop.id, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setConfirmRevoke(null);
    } catch {
      setRevokeError(t.invites.errorRevoke);
    } finally {
      setRevoking(false);
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

      {/* Send Invite Form */}
      <div className="invites-form-card">
        <h2>{t.invites.sendInvite}</h2>
        <form onSubmit={handleSend}>
          <div className="invites-form-row">
            <div className="form-group">
              <label>{t.invites.emailLabel}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required
                disabled={sending}
              />
            </div>
            <div className="form-group">
              <label>{t.invites.roleLabel}</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShopRole)}
                disabled={sending}
              >
                <option value="staff">{t.invites.roles.staff}</option>
                <option value="owner">{t.invites.roles.owner}</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? t.invites.sending : t.invites.sendInvite}
            </button>
          </div>
          {sendFeedback && (
            <p className={`invites-form-feedback invites-form-feedback--${sendFeedback.type}`}>
              {sendFeedback.msg}
            </p>
          )}
        </form>
      </div>

      {/* Invites Table */}
      {invites.length === 0 ? (
        <p className="invites-empty">{t.invites.noSent}</p>
      ) : (
        <div className="invites-table-card">
          <table className="invites-table">
            <thead>
              <tr>
                <th>{t.invites.emailLabel}</th>
                <th>{t.invites.roleLabel}</th>
                <th>Status</th>
                <th>{t.invites.expiresAt}</th>
                <th>{t.invites.sentAt}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="invites-table-row">
                  <td>{invite.email}</td>
                  <td>
                    <span className={`invite-role-badge ${invite.role === 'owner' ? 'invite-role-owner' : ''}`}>
                      {t.invites.roles[invite.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`invite-status-badge invite-status-${invite.status}`}>
                      {t.invites.status[invite.status]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {new Date(invite.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {invite.status === 'pending' && (
                      <div className="invite-actions">
                        {confirmRevoke === invite.id ? (
                          <>
                            <button
                              className="btn btn-danger"
                              onClick={() => handleRevoke(invite.id)}
                              disabled={revoking}
                            >
                              {revoking ? t.invites.revoking : t.invites.revoke}
                            </button>
                            <button
                              className="btn btn-ghost"
                              onClick={() => setConfirmRevoke(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => {
                              setConfirmRevoke(invite.id);
                              setRevokeError('');
                            }}
                          >
                            {t.invites.revoke}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {revokeError && (
            <div style={{ padding: '0.75rem 1.25rem' }}>
              <div className="alert alert-error">{revokeError}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
