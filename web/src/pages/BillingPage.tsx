import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createPortalSession } from '../api/billing.api';
import { getMe } from '../api/user.api';
import '../styles/pages/billing.css';

export default function BillingPage() {
  const { user, setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      // Re-fetch user to get updated plan
      getMe().then((data) => {
        setUser(data.user);
        setSuccessMsg('🎉 You are now on Pro!');
      });
    }
  }, []);

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-page">
      <h1 className="billing-title">Billing</h1>

      {successMsg && <div className="billing-alert">{successMsg}</div>}

      <div className="card billing-card">
        <div className="billing-field">
          <span className="billing-label">Current Plan</span>
          <span className={`plan-badge plan-badge--${user?.plan}`}>
            {user?.plan === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>

        {user?.plan === 'pro' && user.subscription && (
          <div className="billing-field">
            <span className="billing-label">
              {user.subscription.status === 'canceled'
              ? 'Access until'
              : user.subscription.cancelAtPeriodEnd
                ? 'Cancels on'
                : 'Renews on'}
            </span>
            <span>{new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</span>
          </div>
        )}

        <div className="billing-actions">
          {user?.plan === 'pro' ? (
            <button className="btn btn-primary" onClick={handleManageSubscription} disabled={loading}>
              {loading ? 'Redirecting...' : 'Manage Subscription'}
            </button>
          ) : (
            <a href="/pricing" className="btn btn-primary">Upgrade to Pro</a>
          )}
        </div>
      </div>
    </div>
  );
}
