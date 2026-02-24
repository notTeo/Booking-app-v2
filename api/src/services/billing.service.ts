import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const stripe = new Stripe(env.stripe.secretKey);

// Gets existing Stripe customer or creates a new one
export const getOrCreateStripeCustomer = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({ email: user.email });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  logger.info(`Stripe customer created for userId: ${userId}`);
  return customer.id;
};

export const createCheckoutSession = async (userId: string): Promise<string> => {
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: env.stripe.proPriceId, quantity: 1 }],
    success_url: `${env.clientUrl}/billing?success=true`,
    cancel_url: `${env.clientUrl}/pricing?canceled=true`,
  });

  return session.url!;
};

export const createPortalSession = async (userId: string): Promise<string> => {
  const customerId = await getOrCreateStripeCustomer(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.clientUrl}/billing`,
  });

  return session.url;
};

export const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session) => {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) {
    logger.warn(`No user found for stripeCustomerId: ${customerId}`);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(`Subscription created for userId: ${user.id}`);
};

export const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  if (subscription.cancel_at) {
    
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    },
  });
  logger.warn(subscription.cancel_at_period_end)
  logger.warn(subscription.status)
  logger.info(`Subscription updated: ${subscription.id}`);
};

export const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'canceled', cancelAtPeriodEnd: false },
  });

  logger.info(`Subscription canceled: ${subscription.id}`);
};