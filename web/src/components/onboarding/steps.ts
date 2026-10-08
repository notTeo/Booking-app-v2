import type { ReactElement, ReactNode } from 'react';
import type { Shop } from '../../api/shop.api';

/** What every setup step is handed by the setup page. */
export interface SetupStepProps {
  shop: Shop;
  /** The owner's own team member (their hours; the services they offer). */
  ownerMemberId: string;
  /** Wraps the step in the wizard frame, with the step's own footer. */
  frame: (footer: ReactNode, children: ReactNode) => ReactElement;
  /** To the next step: the same for the main button and for Skip. */
  onNext: () => void;
  /** Absent on the first setup step, which has nothing to go back to. */
  onBack?: () => void;
}
