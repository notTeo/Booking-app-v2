import client from './client';
import { deletePhoto, putPhoto, type PhotoCrop, type PhotoFields } from './photo.api';
import type { ShopRole } from './shop.api';

export type { ShopRole };

/** Roles that can be given out: the owner role only moves by transfer. */
export type AssignableRole = Exclude<ShopRole, 'owner'>;

export interface TeamMember extends PhotoFields {
  id: string;         // UserShop.id — used as memberId in URLs
  userId: string | null; // null = no login yet
  shopId: string;
  role: ShopRole;
  name: string;
  email: string | null;
  canViewCustomerDetails: boolean;
  /** Manager permissions, set by the owner. Always false for staff. */
  canManageManagers: boolean;
  canEditShopSettings: boolean;
  active: boolean;
  bookableByCustomers: boolean;
  bookableInternally: boolean;
  createdAt: string;
  hasPendingInvite: boolean;
}

export interface CreateTeamMemberDto {
  name: string;
  email?: string;
  role: AssignableRole;
  canViewCustomerDetails?: boolean;
  sendEmail?: boolean;
}

export interface UpdateMemberRoleDto {
  role: ShopRole;
  canViewCustomerDetails?: boolean;
  canManageManagers?: boolean;
  canEditShopSettings?: boolean;
  email?: string;
  active?: boolean;
  bookableByCustomers?: boolean;
  bookableInternally?: boolean;
}

export const getMembers = (shopId: string) =>
  client.get(`/api/shops/${shopId}/team`).then((r) => r.data.data as TeamMember[]);

export const getMember = (shopId: string, memberId: string) =>
  client.get(`/api/shops/${shopId}/team/${memberId}`).then((r) => r.data.data as TeamMember);

export const createTeamMember = (shopId: string, dto: CreateTeamMemberDto) =>
  client.post(`/api/shops/${shopId}/team`, dto).then((r) => r.data.data as TeamMember);

export const updateMemberRole = (shopId: string, memberId: string, dto: UpdateMemberRoleDto) =>
  client
    .patch(`/api/shops/${shopId}/team/${memberId}`, dto)
    .then((r) => r.data.data as TeamMember);

export const removeMember = (shopId: string, memberId: string) =>
  client.delete(`/api/shops/${shopId}/team/${memberId}`).then((r) => r.data);

export const sendLoginInvite = (shopId: string, memberId: string) =>
  client.post(`/api/shops/${shopId}/team/${memberId}/invite`).then((r) => r.data.data as TeamMember);

export const cancelLoginInvite = (shopId: string, memberId: string) =>
  client.delete(`/api/shops/${shopId}/team/${memberId}/invite`).then((r) => r.data.data as TeamMember);

/** The owner hands the shop to a manager and becomes a manager themself. */
export const transferOwnership = (shopId: string, memberId: string) =>
  client
    .post(`/api/shops/${shopId}/team/${memberId}/transfer-ownership`)
    .then((r) => r.data.data as TeamMember);

/** A member's photo: a new file, or (file null) a new crop of the stored one. */
export const setMemberPhoto = (shopId: string, memberId: string, file: File | null, crop: PhotoCrop) =>
  putPhoto<TeamMember>(`/api/shops/${shopId}/team/${memberId}/photo`, file, crop);

export const removeMemberPhoto = (shopId: string, memberId: string) =>
  deletePhoto<TeamMember>(`/api/shops/${shopId}/team/${memberId}/photo`);
