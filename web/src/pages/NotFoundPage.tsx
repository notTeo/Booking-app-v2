import { Link } from 'react-router-dom';
import '../styles/pages/not-found.css';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <p className="not-found-code">404</p>
      <p className="not-found-title">Page not found</p>
      <p className="not-found-message">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/"><button className="btn btn-primary">Go Home</button></Link>
    </div>
  );
}
