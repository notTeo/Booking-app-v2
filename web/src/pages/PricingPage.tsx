import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createCheckoutSession } from '../api/billing.api';
import '../styles/pages/plans.css';

export default function PricingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    try {
      setLoading(true);
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="plans-page">
        <h1 className="plans-title">Simple, Honest Pricing</h1>

        <div className="plans-grid">
          {/* Starter Plan */}
          <div className="card plan-card">
            <h2 className="plan-name">Starter</h2>
            <p className="plan-price">€0 / month</p>
            <ul className="plan-features">
              <li>1 staff member</li>
              <li>Online booking page</li>
              <li>Up to 30 appointments per month</li>
              <li>Email booking confirmations</li>
              <li>Basic service management</li>
            </ul>
            <button className="btn btn-ghost" disabled>
              {user?.plan === 'free' || !isAuthenticated ? 'Current Plan' : ''}
            </button>
          </div>

          {/* Pro Plan */}
          <div className="card plan-card plan-card--pro">
            <h2 className="plan-name">Pro</h2>
            <p className="plan-price">€19 / month</p>
            <ul className="plan-features">
              <li>Everything in Starter</li>
              <li>Unlimited appointments</li>
              <li>Up to 10 staff members</li>
              <li>SMS & email reminders</li>
              <li>Client profiles & history</li>
              <li>Multi-location support</li>
            </ul>
            {user?.plan === 'pro' ? (
              <button className="btn btn-ghost" disabled>Current Plan</button>
            ) : (
              <button className="btn btn-primary" onClick={handleUpgrade} disabled={loading}>
                {loading ? 'Redirecting...' : 'Upgrade to Pro'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}