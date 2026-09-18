interface RedactableCustomer {
  name: string;
  phone: string;
  email: string | null;
  [key: string]: unknown;
}

/**
 * Staff members without `canViewCustomerDetails` see a generic "Customer"
 * placeholder (translated client-side) instead of contact info — enforced
 * here, not just hidden in the UI, since the API is the only real boundary.
 */
export const redactCustomer = <T extends RedactableCustomer>(
  customer: T,
  canView: boolean,
): T & { contactHidden: boolean } => {
  if (canView) return { ...customer, contactHidden: false };
  return { ...customer, name: '', phone: '', email: null, contactHidden: true };
};
