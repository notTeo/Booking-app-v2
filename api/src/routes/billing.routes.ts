import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createCheckoutSessionController,
  createPortalSessionController,
  handleWebhook,
} from '../controllers/billing.controller';

const router = Router();

// IMPORTANT: raw body required for Stripe signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.post('/create-checkout-session', authenticate, createCheckoutSessionController);
router.post('/create-portal-session', authenticate, createPortalSessionController);

export default router;