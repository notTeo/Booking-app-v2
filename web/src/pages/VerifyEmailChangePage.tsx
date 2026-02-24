import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmailChange } from '../api/auth.api';
import '../styles/pages/verify-email.css';

export default function VerifyEmailChangePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmailChange(token)
      .then(() => {
        setStatus('success');
        setMessage('Your email address has been updated successfully.');
      })
      .catch((err: any) => {
        const msg = err.response?.data?.message ?? 'Verification failed.';
        setStatus('error');
        setMessage(msg);
      });
  }, [searchParams]);

  return (
    <div className="page">
      <div className="card">
        <h1>Email Change Verification</h1>

        {status === 'loading' && <p className="verify-email-status">Verifying...</p>}

        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <Link to="/dashboard"><button className="btn btn-primary">Go to Dashboard</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>
            <Link to="/settings"><button className="btn btn-ghost">Back to Settings</button></Link>
          </>
        )}
      </div>
    </div>
  );
}
