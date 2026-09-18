import client from './client';

export type ShopRole = 'owner' | 'staff';

export interface TeamMember {
  id: string;         // UserShop.id — used as memberId in URLs
  userId: string | null; // null = no login yet
  shopId: string;
  role: ShopRole;
  name: string;
  email: string | null;
  canViewCustomerDetails: boolean;
  createdAt: string;
  hasPendingInvite: boolean;
}

export interface CreateTeamMemberDto {
  name: string;
  email?: string;
  role: ShopRole;
  canViewCustomerDetails?: boolean;
  sendEmail?: boolean;
}

export interface UpdateMemberRoleDto {
  role: ShopRole;
  canViewCustomerDetails?: boolean;
  email?: string;
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
