// TODO: Payment provider integration
// This file previously contained Stripe checkout, portal, and webhook handlers.
// Re-implement these functions when a payment provider is configured.
//
// Functions to restore:
//   getOrCreateCustomer(userId: string): Promise<string>
//   createCheckoutSession(userId: string): Promise<string>
//   createPortalSession(userId: string): Promise<string>
//   handleCheckoutSessionCompleted(session: unknown): Promise<void>
//   handleSubscriptionUpdated(subscription: unknown): Promise<void>
//   handleSubscriptionDeleted(subscription: unknown): Promise<void>
