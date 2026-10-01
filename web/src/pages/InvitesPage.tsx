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
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

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
    } catch (err: unknown) {
      setActionError(apiErrorMessage(err, t.invites.errorAccept));
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
      setConfirmDecline(null);
      setActionError(t.invites.errorDecline);
    } finally {
      setActionLoading(null);
    }
  };

  // Shared between the received-invites table row and its mobile card.
  const renderReceivedActions = (invite: ShopInvite) => (
    <div className="invite-actions">
      <button
        className="btn btn--sm"
        disabled={actionLoading === invite.id}
        onClick={() => handleAccept(invite.id)}
      >
        {actionLoading === invite.id ? t.invites.accepting : t.invites.accept}
      </button>
      <button className="btn btn--sm btn--secondary" onClick={() => setConfirmDecline(invite.id)}>
        {t.invites.decline}
      </button>
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

      {error && <Alert variant="danger">{error}</Alert>}
      {actionError && <Alert variant="danger">{actionError}</Alert>}

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
        <div className="table-wrap">
          <div className="table-surface">
            {received.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">{t.invites.noReceived}</p>
              </div>
            ) : (
              <table className="data-table" role="table">
                <thead>
                  <tr role="row">
                    <th scope="col" role="columnheader">{t.invites.shopLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.roleLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.invitedBy}</th>
                    <th scope="col" role="columnheader">{t.invites.expiresAt}</th>
                    <th scope="col" role="columnheader"><span className="visually-hidden">{t.team.actions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {received.map((invite) => (
                    <tr key={invite.id} role="row">
                      <td role="cell" data-label={t.invites.shopLabel} className="data-table__title">
                        {invite.shop?.name ?? invite.shopId}
                      </td>
                      <td role="cell" data-label={t.invites.roleLabel}>
                        <span className={`badge ${invite.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                          {t.invites.roles[invite.role]}
                        </span>
                      </td>
                      <td role="cell" data-label={t.invites.invitedBy}>{invite.createdBy?.email ?? '—'}</td>
                      <td role="cell" data-label={t.invites.expiresAt}>
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                      <td role="cell" data-label="" className="data-table__actions">
                        {renderReceivedActions(invite)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="table-wrap">
          <div className="table-surface">
            {sent.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">{t.invites.noSent}</p>
              </div>
            ) : (
              <table className="data-table" role="table">
                <thead>
                  <tr role="row">
                    <th scope="col" role="columnheader">{t.invites.shopLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.emailLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.roleLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.statusLabel}</th>
                    <th scope="col" role="columnheader">{t.invites.sentAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {sent.map((invite) => (
                    <tr key={invite.id} role="row">
                      <td role="cell" data-label={t.invites.shopLabel} className="data-table__title">
                        {invite.shop?.name ?? invite.shopId}
                      </td>
                      <td role="cell" data-label={t.invites.emailLabel}>{invite.email}</td>
                      <td role="cell" data-label={t.invites.roleLabel}>
                        <span className={`badge ${invite.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>
                          {t.invites.roles[invite.role]}
                        </span>
                      </td>
                      <td role="cell" data-label={t.invites.statusLabel}>
                        <span className={`badge ${invite.status === 'accepted' ? 'badge--success' : invite.status === 'pending' ? 'badge--warning' : 'badge--neutral'}`}>
                          {t.invites.status[invite.status]}
                        </span>
                      </td>
                      <td role="cell" data-label={t.invites.sentAt}>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {confirmDecline && (
        <ConfirmDialog
          tone="danger"
          title={t.invites.declineTitle.replace('{shop}', received.find((i) => i.id === confirmDecline)?.shop?.name ?? '')}
          message={t.invites.declineMessage}
          confirmLabel={t.invites.declineConfirmButton}
          cancelLabel={t.team.cancel}
          busy={actionLoading === confirmDecline}
          onConfirm={() => handleDecline(confirmDecline)}
          onCancel={() => setConfirmDecline(null)}
        />
      )}
    </div>
  );
}
