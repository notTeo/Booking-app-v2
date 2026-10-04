import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLang } from '../../context/LanguageContext';
import { acceptInvite, declineInvite, type ShopInvite } from '../../api/invite.api';
import { MY_INVITES_KEY } from '../../hooks/useMyInvites';
import { MY_SHOPS_KEY } from '../../hooks/useMyShops';
import { apiErrorMessage } from '../../utils/apiError';
import Alert from '../Alert';
import ConfirmDialog from '../ConfirmDialog';

type InvitesData = { received: ShopInvite[]; sent: ShopInvite[] };

/** The dashboard's pending invites. Accept goes into the shop; Decline removes the card. */
export default function InviteInbox({ invites }: { invites: ShopInvite[] }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleAccept = async (invite: ShopInvite) => {
    if (busyId) return;
    setBusyId(invite.id);
    setError('');
    try {
      const result = await acceptInvite(invite.id);
      queryClient.invalidateQueries({ queryKey: MY_INVITES_KEY });
      queryClient.invalidateQueries({ queryKey: MY_SHOPS_KEY });
      navigate(`/shops/${result.shopSlug}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.invites.errorAccept));
      setBusyId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setBusyId(inviteId);
    setError('');
    try {
      await declineInvite(inviteId);
      queryClient.setQueryData<InvitesData>(MY_INVITES_KEY, (old) =>
        old && { ...old, received: old.received.filter((i) => i.id !== inviteId) },
      );
    } catch {
      setError(t.invites.errorDecline);
    } finally {
      setConfirmId(null);
      setBusyId(null);
    }
  };

  const confirming = invites.find((i) => i.id === confirmId);

  return (
    <section className="shop-cards" aria-labelledby="dashboard-invites-title">
      <h2 className="card__title" id="dashboard-invites-title">{t.dashboard.invites.title}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <ul className="shop-cards__grid">
        {invites.map((invite) => {
          const accepting = busyId === invite.id && confirmId !== invite.id;
          return (
            <li key={invite.id}>
              <div className="card shop-card">
                <span className="shop-card__name">{invite.shop?.name ?? invite.shopId}</span>
                <span className="shop-card__label">
                  {t.dashboard.invites.from
                    .replace('{email}', invite.createdBy?.email ?? '—')
                    .replace('{role}', t.invites.roles[invite.role])}
                </span>
                <div className="shop-card__actions">
                  <button
                    type="button"
                    className={`btn btn--sm${accepting ? ' is-loading' : ''}`}
                    aria-busy={accepting}
                    disabled={!!busyId && !accepting}
                    onClick={() => handleAccept(invite)}
                  >
                    {t.invites.accept}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--secondary"
                    disabled={!!busyId}
                    onClick={() => setConfirmId(invite.id)}
                  >
                    {t.invites.decline}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {confirming && (
        <ConfirmDialog
          tone="danger"
          title={t.invites.declineTitle.replace('{shop}', confirming.shop?.name ?? '')}
          message={t.invites.declineMessage}
          confirmLabel={t.invites.declineConfirmButton}
          cancelLabel={t.team.cancel}
          busy={busyId === confirming.id}
          onConfirm={() => handleDecline(confirming.id)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </section>
  );
}
