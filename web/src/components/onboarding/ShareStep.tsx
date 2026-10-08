import { useNavigate } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import { publicShopUrl } from '../../utils/publicLink';
import Alert from '../Alert';
import CopyLinkButton from '../CopyLinkButton';
import { WizardFooter, WizardIntro } from './Wizard';
import type { SetupStepProps } from './steps';

// The end of setup: the booking link to copy, open or show as a QR code, and
// an honest word when nobody can book yet.
export default function ShareStep({ shop, frame, onBack, hasServices }: SetupStepProps & { hasServices: boolean }) {
  const { t } = useLang();
  const to = t.onboarding;
  const navigate = useNavigate();

  return frame(
    <WizardFooter onBack={onBack} main={{ label: to.share.goToShop, onClick: () => navigate(`/shops/${shop.slug}`) }} />,
    <>
      <WizardIntro title={to.share.title} text={to.share.intro} />
      {!hasServices && <Alert variant="warning">{to.share.noServices}</Alert>}
      <div className="card">
        <CopyLinkButton
          link={publicShopUrl(shop.slug)}
          qr={{ title: to.share.qrTitle, alt: to.share.qrAlt, fileName: `${shop.slug}-booking-qr` }}
        />
        <p className="card__text">{to.share.later}</p>
      </div>
    </>,
  );
}
