import { Link } from 'react-router-dom';
import AppPalette from './AppPalette';
import LangSwitch from './LangSwitch';
import Wordmark from './Wordmark';

/**
 * The top row of an auth card: the way back to the landing page and the
 * language switch. It also puts the visitor's colour set on the page, except
 * on a shop's own pages (`palette={false}`), which have the shop's look.
 */
export default function AuthTop({ back = true, palette = true }: { back?: boolean; palette?: boolean }) {
  return (
    <div className="card__top">
      {palette && <AppPalette />}
      {back && (
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
      )}
      <LangSwitch />
    </div>
  );
}
