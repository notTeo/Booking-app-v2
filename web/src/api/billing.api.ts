import client  from './client';

export const createCheckoutSession = () =>
  client.post('/billing/create-checkout-session').then(r => r.data.data);

export const createPortalSession = () =>
  client.post('/billing/create-portal-session').then(r => r.data.data);