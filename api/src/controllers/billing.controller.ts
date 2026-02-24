import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import { successResponse } from '../utils/response';
import {
  createCheckoutSession,
  createPortalSession,
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from '../services/billing.service';
import { logger } from '../utils/logger';

const stripe = new Stripe(env.stripe.secretKey);

export const createCheckoutSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const url = await createCheckoutSession(req.user!.userId!);
    successResponse(res, { url });
  } catch (err) {
    next(err);
  }
};

export const createPortalSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const url = await createPortalSession(req.user!.userId!);
    successResponse(res, { url });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripe.webhookSecret);
    logger.warn(event)
  } catch (err) {
    logger.warn(`Webhook signature verification failed: ${err}`);
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  // Respond immediately — Stripe expects 200 fast, processing happens async
  res.status(200).json({ received: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (err) {
    logger.error(`Webhook processing error: ${err}`);
  }
};