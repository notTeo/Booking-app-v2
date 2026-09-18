import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import {
  getMyInvites,
  acceptInvite,
  declineInvite,
  type ShopInvite,
} from '../api/invite.api';
import '../styles/pages/invites.css';

type Tab = 'received' | 'sent';

export default function InvitesPage() {
  const { t } = useLang();
  const navigate = useNavigate();

  const [received, setReceived] = useState<ShopInvite[]>([]);
  const [sent, setSent] = useState<ShopInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('received');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [confirmDecline, setConfirmDecline] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMyInvites()
      .then((data) => {
        setReceived(data.received);
        setSent(data.sent);
      })
      .catch(() => setError(t.invites.errorLoad))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async (inviteId: string) => {
    setActionLoading(inviteId);
    setActionError('');
    try {
      const result = await acceptInvite(inviteId);
      setReceived((prev) => prev.filter((i) => i.id !== inviteId));
      navigate(`/shops/${result.shopSlug}`);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? t.invites.errorAccept);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setActionLoading(inviteId);
    setActionError('');
    try {
      await declineInvite(inviteId);
      setReceived((prev) => prev.filter((i) => i.id !== inviteId));
      setConfirmDecline(null);
    } catch {
      setActionError(t.invites.errorDecline);
    } finally {
      setActionLoading(null);
    }
  };

  // Shared between the received-invites table row and its mobile card.
  const renderReceivedActions = (invite: ShopInvite) => (
    <div className="invite-actions">
      <button
        className="btn btn-primary"
        disabled={actionLoading === invite.id}
        onClick={() => handleAccept(invite.id)}
      >
        {actionLoading === invite.id ? t.invites.accepting : t.invites.accept}
      </button>
      {confirmDecline === invite.id ? (
        <>
          <button
            className="btn btn-danger"
            disabled={actionLoading === invite.id}
            onClick={() => handleDecline(invite.id)}
          >
            {actionLoading === invite.id ? t.invites.declining : t.invites.decline}
          </button>
          <button className="btn btn-ghost" onClick={() => setConfirmDecline(null)}>
            Cancel
          </button>
        </>
      ) : (
        <button className="btn btn-ghost" onClick={() => setConfirmDecline(invite.id)}>
          {t.invites.decline}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="invites-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="invites-page">
      <div className="invites-header">
        <h1>{t.invites.title}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="invites-tabs">
        <button
          className={`invites-tab ${activeTab === 'received' ? 'invites-tab--active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          {t.invites.received}
          {received.length > 0 && (
            <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>({received.length})</span>
          )}
        </button>
        <button
          className={`invites-tab ${activeTab === 'sent' ? 'invites-tab--active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          {t.invites.sent}
          {sent.length > 0 && (
            <span style={{ marginLeft: '0.4rem', opacity: 0.7 }}>({sent.length})</span>
          )}
        </button>
      </div>

      {activeTab === 'received' && (
        received.length === 0 ? (
          <p className="invites-empty">{t.invites.noReceived}</p>
        ) : (
          <>
            {/* Desktop / tablet: table (hidden below 640px) */}
            <div className="data-table-card table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.invites.shopLabel}</th>
                    <th>{t.invites.roleLabel}</th>
                    <th>{t.invites.invitedBy}</th>
                    <th>{t.invites.expiresAt}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {received.map((invite) => (
                    <tr key={invite.id} className="data-table-row">
                      <td>{invite.shop?.name ?? invite.shopId}</td>
                      <td>
                        <span className={`invite-role-badge ${invite.role === 'owner' ? 'invite-role-owner' : ''}`}>
                          {t.invites.roles[invite.role]}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {invite.createdBy?.email ?? '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td>{renderReceivedActions(invite)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards (hidden at 640px and above) */}
            <div className="row-cards card-view">
              {received.map((invite) => (
                <div key={invite.id} className="row-card row-card--static">
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.shopLabel}</span>
                    <span className="row-card__value">{invite.shop?.name ?? invite.shopId}</span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.roleLabel}</span>
                    <span className={`invite-role-badge ${invite.role === 'owner' ? 'invite-role-owner' : ''}`}>
                      {t.invites.roles[invite.role]}
                    </span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.invitedBy}</span>
                    <span className="row-card__value">{invite.createdBy?.email ?? '—'}</span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.expiresAt}</span>
                    <span className="row-card__value">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="row-card__actions">{renderReceivedActions(invite)}</div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {activeTab === 'sent' && (
        sent.length === 0 ? (
          <p className="invites-empty">{t.invites.noSent}</p>
        ) : (
          <>
            {/* Desktop / tablet: table (hidden below 640px) */}
            <div className="data-table-card table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.invites.shopLabel}</th>
                    <th>{t.invites.emailLabel}</th>
                    <th>{t.invites.roleLabel}</th>
                    <th>Status</th>
                    <th>{t.invites.sentAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {sent.map((invite) => (
                    <tr key={invite.id} className="data-table-row">
                      <td>{invite.shop?.name ?? invite.shopId}</td>
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
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards (hidden at 640px and above) */}
            <div className="row-cards card-view">
              {sent.map((invite) => (
                <div key={invite.id} className="row-card row-card--static">
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.shopLabel}</span>
                    <span className="row-card__value">{invite.shop?.name ?? invite.shopId}</span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.emailLabel}</span>
                    <span className="row-card__value">{invite.email}</span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.roleLabel}</span>
                    <span className={`invite-role-badge ${invite.role === 'owner' ? 'invite-role-owner' : ''}`}>
                      {t.invites.roles[invite.role]}
                    </span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">Status</span>
                    <span className={`invite-status-badge invite-status-${invite.status}`}>
                      {t.invites.status[invite.status]}
                    </span>
                  </div>
                  <div className="row-card__field">
                    <span className="row-card__label">{t.invites.sentAt}</span>
                    <span className="row-card__value">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
