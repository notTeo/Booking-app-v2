import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { isOnTrial, trialDaysLeft } from '../utils/plan';
import Alert from './Alert';

/** The trial is mentioned to the owner once this few days are left. */
const TRIAL_NOTICE_DAYS = 7;

// Above every page of a shop: that it is read-only (to everyone in it), or,
// to the owner, that its free trial is about to end.
export default function ShopPlanBanner() {
  const { shop } = useShop();
  const { t, language } = useLang();
  if (!shop) return null;

  const contact = <Link to="/contact" className="btn btn--secondary btn--sm">{t.shopPlan.contactUs}</Link>;

  if (shop.locked) {
    return (
      <Alert variant="warning" title={t.shopPlan.lockedTitle} actions={shop.role === 'owner' ? contact : undefined}>
        {shop.role === 'owner' ? t.shopPlan.lockedOwner : t.shopPlan.locked}
      </Alert>
    );
  }

  if (shop.role === 'owner' && isOnTrial(shop) && trialDaysLeft(shop.trialEndsAt) <= TRIAL_NOTICE_DAYS && shop.trialEndsAt) {
    const date = new Date(shop.trialEndsAt).toLocaleDateString(language === 'el' ? 'el-GR' : 'en-GB', { day: 'numeric', month: 'long' });
    return (
      <Alert variant="info" actions={contact}>
        {t.shopPlan.trialEnding.replace('{date}', date)}
      </Alert>
    );
  }

  return null;
}
