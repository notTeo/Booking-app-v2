import { Link } from 'react-router-dom';
import LangSwitch from './LangSwitch';
import Wordmark from './Wordmark';

/** The top row of an auth card: the way back to the landing page and the language switch. */
export default function AuthTop({ back = true }: { back?: boolean }) {
  return (
    <div className="card__top">
      {back && (
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
      )}
      <LangSwitch />
    </div>
  );
}
