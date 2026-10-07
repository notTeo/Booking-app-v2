import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import type { Translations } from '../locales/translations';
import { handleActivateKeyDown } from '../utils/a11y';
import '../styles/pages/help.css';

type SectionKey = keyof Translations['help']['sections'];

// The order on the page. `id` is the anchor other pages link to
// (/help#team-roles), so it is the same in every language. `managers` marks
// topics about pages staff do not have.
const SECTIONS: { key: SectionKey; id: string; managers?: boolean }[] = [
  { key: 'gettingStarted', id: 'getting-started' },
  { key: 'bookings', id: 'bookings' },
  { key: 'teamRoles', id: 'team-roles', managers: true },
  { key: 'customers', id: 'customers', managers: true },
  { key: 'products', id: 'products' },
  { key: 'plans', id: 'plans', managers: true },
  { key: 'publicPage', id: 'public-page', managers: true },
  { key: 'contact', id: 'contact' },
];

const idFromHash = (hash: string) => {
  const id = hash.slice(1);
  return SECTIONS.some((s) => s.id === id) ? id : null;
};

export default function HelpPage() {
  const { t } = useLang();
  const { hash } = useLocation();
  const navigate = useNavigate();
  // One topic open at a time, and the address says which: a link to a topic
  // (/help#plans) opens it, and opening one makes the address that link.
  const [closed, setClosed] = useState(false);
  const openId = closed ? null : idFromHash(hash) ?? SECTIONS[0].id;

  useEffect(() => {
    const id = idFromHash(hash);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="help-page">
      <div className="page-header">
        <h1 className="t-title">{t.help.title}</h1>
      </div>
      <p className="t-body t-muted">{t.help.intro}</p>

      {SECTIONS.map(({ key, id, managers }) => {
        const section = t.help.sections[key];
        const isOpen = openId === id;
        const toggle = () => {
          setClosed(isOpen);
          if (!isOpen) navigate({ hash: id }, { replace: true });
        };
        return (
          <section key={id} id={id} className="card card--flush help-topic" aria-labelledby={`${id}-title`}>
            <div
              className="card__toggle"
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              aria-controls={`${id}-body`}
              onClick={toggle}
              onKeyDown={handleActivateKeyDown(toggle)}
            >
              <div className="help-topic__head">
                <span id={`${id}-title`} className="t-subheading">{section.title}</span>
                {managers && (
                  <span className="badge badge--neutral">
                    <FontAwesomeIcon icon={faUserShield} aria-hidden="true" />
                    {t.help.managersBadge}
                  </span>
                )}
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="card__chevron" aria-hidden="true" />
            </div>
            {isOpen && (
              <div id={`${id}-body`} className="card__section help-topic__body">
                {section.items.map((item) => (
                  <p key={item.lead} className="card__text">
                    <strong>{item.lead}</strong> {item.text}
                  </p>
                ))}
                {key === 'contact' && (
                  <div className="cluster">
                    <Link to="/contact" className="btn btn--secondary">{t.help.contactButton}</Link>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
