import client from './client';

export interface Service {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  duration: number; // minutes
  price: number; // cents
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAssignment {
  id: string;
  userShopId: string;
  serviceId: string;
  userShop: {
    user: { id: string; email: string };
  };
  createdAt: string;
}

export interface ServiceWithStaff extends Service {
  staffServices: StaffAssignment[];
}

export interface CreateServiceDto {
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive?: boolean;
}

export type UpdateServiceDto = Partial<CreateServiceDto>;

const base = (shopId: string) => `/api/shops/${shopId}/services`;

export const getServices = (shopId: string) =>
  client.get(base(shopId)).then((r) => r.data.data as Service[]);

export const getService = (shopId: string, serviceId: string) =>
  client.get(`${base(shopId)}/${serviceId}`).then((r) => r.data.data as ServiceWithStaff);

export const createService = (shopId: string, dto: CreateServiceDto) =>
  client.post(base(shopId), dto).then((r) => r.data.data as Service);

export const updateService = (shopId: string, serviceId: string, dto: UpdateServiceDto) =>
  client.patch(`${base(shopId)}/${serviceId}`, dto).then((r) => r.data.data as Service);

export const deleteService = (shopId: string, serviceId: string) =>
  client.delete(`${base(shopId)}/${serviceId}`).then((r) => r.data);

export const assignStaff = (shopId: string, serviceId: string, userShopId: string) =>
  client
    .post(`${base(shopId)}/${serviceId}/staff`, { userShopId })
    .then((r) => r.data.data);

export const unassignStaff = (shopId: string, serviceId: string, userShopId: string) =>
  client.delete(`${base(shopId)}/${serviceId}/staff/${userShopId}`).then((r) => r.data);

export interface MemberServiceAssignment {
  id: string;
  userShopId: string;
  serviceId: string;
  service: Service;
  createdAt: string;
}

export const getMemberServices = (shopId: string, memberId: string) =>
  client
    .get(`/api/shops/${shopId}/team/${memberId}/services`)
    .then((r) => r.data.data as MemberServiceAssignment[]);
