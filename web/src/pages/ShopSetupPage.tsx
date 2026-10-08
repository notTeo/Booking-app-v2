import { useState, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getShopSetup } from '../api/shop.api';
import { isSetupStep, setupSteps, shopSetupKey, type SetupStep } from '../utils/onboarding';
import Alert from '../components/Alert';
import Wizard from '../components/onboarding/Wizard';
import HoursStep from '../components/onboarding/HoursStep';
import ServicesStep from '../components/onboarding/ServicesStep';
import TeamStep from '../components/onboarding/TeamStep';
import ProductsStep from '../components/onboarding/ProductsStep';
import ShareStep from '../components/onboarding/ShareStep';

// The setup steps of a shop that exists: hours, services, (team, products,)
// share. Reached straight after the shop is created, from the "Finish setup"
// card and from "Run setup again"; `?step=` opens it at one of them. Owner only.
export default function ShopSetupPage() {
  const { shop } = useShop();
  const { t } = useLang();
  const to = t.onboarding;
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [back, setBack] = useState(false);

  const allowed = !!shop && shop.role === 'owner' && !shop.locked;
  const setupQuery = useQuery({
    queryKey: shopSetupKey(shop?.id),
    queryFn: () => getShopSetup(shop!.id),
    enabled: allowed,
    retry: 1,
  });

  if (!shop) return null;
  if (!allowed) return <Navigate to={`/shops/${shop.slug}`} replace />;

  const keys = setupSteps(shop);
  const requested = params.get('step');
  const step: SetupStep = isSetupStep(requested) && keys.includes(requested) ? requested : keys[0];
  const index = keys.indexOf(step);

  const go = (next: SetupStep) => {
    setBack(keys.indexOf(next) < index);
    setParams({ step: next });
    // What the last step changed shows on the next one (and on the overview's card).
    queryClient.invalidateQueries({ queryKey: shopSetupKey(shop.id) });
    window.scrollTo(0, 0);
  };

  // Plan and Shop are behind: the shop exists, and its booking link is fixed.
  const steps = [
    { key: 'plan', label: to.steps.plan },
    { key: 'shop', label: to.steps.shop },
    ...keys.map((key, i) => ({ key, label: to.steps[key], onOpen: i < index ? () => go(key) : undefined })),
  ];
  const frame = (footer: ReactNode, children: ReactNode) => (
    <Wizard steps={steps} current={index + 2} back={back} footer={footer}>
      {children}
    </Wizard>
  );

  const setup = setupQuery.data;
  if (!setup) {
    return frame(
      null,
      setupQuery.isError ? (
        <Alert
          variant="danger"
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setupQuery.refetch()}>
              {t.shopGate.retry}
            </button>
          }
        >
          {to.errorLoad}
        </Alert>
      ) : (
        <div className="spinner-wrap"><div className="spinner spinner--lg" role="status" /></div>
      ),
    );
  }

  const props = {
    shop,
    ownerMemberId: setup.ownerMemberId,
    frame,
    onNext: () => go(keys[Math.min(index + 1, keys.length - 1)]),
    onBack: index > 0 ? () => go(keys[index - 1]) : undefined,
  };
  switch (step) {
    case 'hours':
      return <HoursStep {...props} />;
    case 'services':
      return <ServicesStep {...props} />;
    case 'team':
      return <TeamStep {...props} />;
    case 'products':
      return <ProductsStep {...props} />;
    case 'share':
      return <ShareStep {...props} hasServices={setup.hasServices || setupQuery.isFetching} />;
  }
}
