import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { getMembers, type TeamMember } from '../../api/team.api';
import { ROLE_BADGE } from '../../utils/roles';
import { staffLimitText } from '../../utils/plan';
import AddMemberModal from '../AddMemberModal';
import Alert from '../Alert';
import { WizardFooter, WizardIntro } from './Wizard';
import type { SetupStepProps } from './steps';

const takesPlace = (m: TeamMember) => m.active && (m.bookableByCustomers || m.bookableInternally);

// The team so far, a line on what the roles are, and the same "add member"
// pop-up as the Team page. Plans with team features only.
export default function TeamStep({ shop, ownerMemberId, frame, onNext, onBack }: SetupStepProps) {
  const { t } = useLang();
  const to = t.onboarding;
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    getMembers(shop.id)
      .then((list) => live && setMembers(list))
      .catch(() => live && setError(to.errorLoad));
    return () => {
      live = false;
    };
  }, [shop.id, to.errorLoad]);

  const active = (members ?? []).filter((m) => m.active);
  const full = active.filter(takesPlace).length >= shop.staffLimit;

  return frame(
    <WizardFooter onBack={onBack} onSkip={onNext} main={{ label: to.continue, onClick: onNext }} />,
    <>
      <WizardIntro title={to.team.title} text={to.team.intro} />
      <Alert variant="info" title={to.team.rolesTitle}>
        {to.team.rolesText} <Link to="/help#team-roles">{to.team.rolesLink}</Link>
      </Alert>
      {error && <Alert variant="danger">{error}</Alert>}
      {members === null && !error && <div className="spinner-wrap"><div className="spinner" role="status" /></div>}
      {members && (
        <div className="card">
          <ul className="list">
            {active.map((member) => (
              <li key={member.id} className="list__item">
                <span>
                  <strong>{member.name}</strong>
                  {member.id === ownerMemberId && <span className="t-muted"> · {to.team.you}</span>}
                </span>
                <span className={`badge ${ROLE_BADGE[member.role]}`}>{t.invites.roles[member.role]}</span>
              </li>
            ))}
          </ul>
          <p className="card__text">
            {full ? staffLimitText(t.shopPlan, shop.plan, shop.staffLimit) : to.team.places.replace('{n}', String(shop.staffLimit))}
          </p>
        </div>
      )}
      <button type="button" className="card card--dashed" onClick={() => setAdding(true)} disabled={!members || full}>
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        {to.team.add}
      </button>
      {adding && (
        <AddMemberModal
          shopId={shop.id}
          canAddManager
          plan={shop.plan}
          teamFeatures={shop.teamFeatures}
          onCreated={(member) => {
            setMembers((prev) => [...(prev ?? []), member]);
            setAdding(false);
          }}
          onClose={() => setAdding(false)}
        />
      )}
    </>,
  );
}
