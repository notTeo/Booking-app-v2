import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { getShopSetup, type Shop } from '../../api/shop.api';
import { shopSetupKey, type SetupStep } from '../../utils/onboarding';

// What is left before customers can book: working hours and services. Team
// and products are listed too, as optional, on the plans that have them. Read
// from the shop's own data; the card is gone once hours and services are done.
// For the owner of a shop that can be changed; nobody else sees it.
export default function FinishSetupCard({ shop }: { shop: Shop }) {
  const { t } = useLang();
  const tf = t.onboarding.finish;
  const { data: setup } = useQuery({
    queryKey: shopSetupKey(shop.id),
    queryFn: () => getShopSetup(shop.id),
    enabled: shop.role === 'owner' && !shop.locked,
    retry: 1,
  });

  if (!setup || (setup.hasHours && setup.hasServices)) return null;

  const required: Task[] = [
    { step: 'hours', done: setup.hasHours, title: tf.hours, text: tf.hoursText, action: tf.hoursAction },
    { step: 'services', done: setup.hasServices, title: tf.services, text: tf.servicesText, action: tf.servicesAction },
  ];
  const optional: Task[] = [];
  if (shop.teamFeatures)
    optional.push({ step: 'team', done: setup.hasTeam, title: tf.team, text: tf.teamText, action: tf.teamAction });
  if (shop.products)
    optional.push({ step: 'products', done: setup.hasProducts, title: tf.products, text: tf.productsText, action: tf.productsAction });
  const done = required.filter((task) => task.done).length;
  // The first thing still to do gets the main button; the rest stay quiet.
  const next = required.find((task) => !task.done)?.step;

  return (
    <section className="card card--glow" aria-labelledby="finish-setup-title">
      <div className="card__header">
        <h2 className="card__title" id="finish-setup-title">{tf.title}</h2>
        <span className="badge badge--accent">
          {tf.count.replace('{done}', String(done)).replace('{total}', String(required.length))}
        </span>
      </div>
      <p className="card__text">{tf.text}</p>
      <div className="wizard-progress__bar" aria-hidden="true">
        {required.map((task) => (
          <span key={task.step} className={task.done ? 'is-done' : ''} />
        ))}
      </div>
      <ul className="list">
        {[...required, ...optional].map((task) => (
          <li key={task.step} className="list__item">
            <span className="finish-setup__task">
              {task.done ? (
                <FontAwesomeIcon icon={faCircleCheck} className="finish-setup__done" aria-hidden="true" />
              ) : (
                <span className="finish-setup__todo" aria-hidden="true" />
              )}
              <span className="setting-row__label">
                <span className="setting-row__title">{task.title}</span>
                <span className="setting-row__text">{task.text}</span>
              </span>
            </span>
            {task.done ? (
              <span className="badge badge--success">{tf.done}</span>
            ) : (
              <Link
                to={`/shops/${shop.slug}/setup?step=${task.step}`}
                className={`btn btn--sm${task.step === next ? '' : ' btn--ghost'}`}
              >
                {task.action}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Task {
  step: SetupStep;
  done: boolean;
  title: string;
  text: string;
  action: string;
}
