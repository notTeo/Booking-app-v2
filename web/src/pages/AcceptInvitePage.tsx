import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { lookupInvite, acceptInvite, type InviteLookup } from '../api/invite.api';
import { MY_INVITES_KEY } from '../hooks/useMyInvites';
import { MY_SHOPS_KEY } from '../hooks/useMyShops';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';

export default function AcceptInvitePage() {
  const { t } = useLang();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [loading, setLoading] = useState(true);

  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (!token) {
      setLookupError(t.invites.inviteNotFound);
      setLoading(false);
      return;
    }
    lookupInvite(token)
      .then(setInvite)
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, '');
        if (msg.includes('expired')) setLookupError(t.invites.inviteExpired);
        else if (msg.includes('used') || msg.includes('accepted')) setLookupError(t.invites.inviteUsed);
        else setLookupError(t.invites.inviteNotFound);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAcceptNow = async () => {
    if (!invite) return;
    setAccepting(true);
    setAcceptError('');
    try {
      const result = await acceptInvite(invite.inviteId);
      // The dashboard must not still offer this invite, and must list the shop.
      queryClient.invalidateQueries({ queryKey: MY_INVITES_KEY });
      queryClient.invalidateQueries({ queryKey: MY_SHOPS_KEY });
      navigate(`/shops/${result.shopSlug}`);
    } catch (err: unknown) {
      setAcceptError(apiErrorMessage(err, t.invites.errorAccept));
    } finally {
      setAccepting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page page--center">
        <div className="card card--auth card--center">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  if (lookupError) {
    return (
      <div className="page page--center">
        <div className="card card--auth card--center">
          <Alert variant="danger">{lookupError}</Alert>
          <Link to="/dashboard" className="btn btn--secondary btn--block">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!invite) return null;

  const emailMatches = user?.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="page page--center">
      <div className="card card--auth card--center">
        <h1 className="t-heading">{t.invites.youreInvited}</h1>
        <div className="card__text">
          <p>
            <strong>{invite.invitedBy}</strong> invited you to join{' '}
            <strong>{invite.shopName}</strong>
          </p>
          <p>
            {t.invites.joinAs}{' '}
            <strong>{t.invites.roles[invite.role]}</strong>
          </p>
        </div>
        <p className="card__text">
          {t.invites.inviteFor}: {invite.email}
        </p>

        {acceptError && (
          <Alert variant="danger">
            {acceptError}
          </Alert>
        )}

        {isAuthenticated ? (
          emailMatches ? (
            <button
              className="btn btn--block"
              disabled={accepting}
              onClick={handleAcceptNow}
            >
              {accepting ? t.invites.accepting2 : t.invites.acceptNow}
            </button>
          ) : (
            <>
              <Alert variant="warning">
                {t.invites.emailMismatch} ({invite.email})
              </Alert>
              <Link
                to={`/register?inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`}
                className="btn btn--block"
              >
                {t.invites.registerToAccept}
              </Link>
            </>
          )
        ) : (
          <>
            <Link
              to={`/register?inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`}
              className="btn btn--block"
            >
              {t.invites.registerToAccept}
            </Link>
            <Link
              to={`/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="btn btn--secondary btn--block"
            >
              {t.invites.loginToAccept}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
