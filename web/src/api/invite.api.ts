import client from './client';

export type InviteStatus = 'pending' | 'accepted' | 'expired';
export type ShopRole = 'owner' | 'staff';

export interface ShopInvite {
  id: string;
  shopId: string;
  email: string;
  role: ShopRole;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; email: string };
  shop?: { id: string; name: string; slug: string };
}

export interface InviteLookup {
  inviteId: string;
  shopName: string;
  shopSlug: string;
  role: ShopRole;
  email: string;
  invitedBy: string;
  expiresAt: string;
}

export interface CreateInviteDto {
  email: string;
  role: ShopRole;
}

export interface AcceptInviteResult {
  shopId: string;
  shopSlug: string;
  role: ShopRole;
}

// Shop-scoped
export const createInvite = (shopId: string, dto: CreateInviteDto) =>
  client.post(`/api/shops/${shopId}/invites`, dto).then((r) => r.data.data as ShopInvite);

export const getShopInvites = (shopId: string) =>
  client.get(`/api/shops/${shopId}/invites`).then((r) => r.data.data as ShopInvite[]);

export const revokeInvite = (shopId: string, inviteId: string) =>
  client.delete(`/api/shops/${shopId}/invites/${inviteId}`).then((r) => r.data);

// Global inbox
export const getMyInvites = () =>
  client
    .get('/api/invites')
    .then((r) => r.data.data as { received: ShopInvite[]; sent: ShopInvite[] });

export const acceptInvite = (inviteId: string) =>
  client.post(`/api/invites/${inviteId}/accept`).then((r) => r.data.data as AcceptInviteResult);

export const declineInvite = (inviteId: string) =>
  client.post(`/api/invites/${inviteId}/decline`).then((r) => r.data);

// Public lookup — no auth required; uses plain axios client which sends Bearer if present (harmless)
export const lookupInvite = (token: string) =>
  client
    .get(`/api/invites/lookup?token=${encodeURIComponent(token)}`)
    .then((r) => r.data.data as InviteLookup);
