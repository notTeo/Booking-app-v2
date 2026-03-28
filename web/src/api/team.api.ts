import client from './client';

export type ShopRole = 'owner' | 'staff';

export interface TeamMember {
  id: string;        // UserShop.id
  userId: string;    // User.id — used as memberId in URLs
  shopId: string;
  role: ShopRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface UpdateMemberRoleDto {
  role: ShopRole;
}

export const getMembers = (shopId: string) =>
  client.get(`/api/shops/${shopId}/team`).then((r) => r.data.data as TeamMember[]);

export const getMember = (shopId: string, memberId: string) =>
  client.get(`/api/shops/${shopId}/team/${memberId}`).then((r) => r.data.data as TeamMember);

export const updateMemberRole = (shopId: string, memberId: string, dto: UpdateMemberRoleDto) =>
  client
    .patch(`/api/shops/${shopId}/team/${memberId}`, dto)
    .then((r) => r.data.data as TeamMember);

export const removeMember = (shopId: string, memberId: string) =>
  client.delete(`/api/shops/${shopId}/team/${memberId}`).then((r) => r.data);
