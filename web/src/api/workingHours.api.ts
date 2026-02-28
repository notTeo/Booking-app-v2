import client from './client';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface HourRange {
  startTime: string;
  endTime: string;
}

export interface WorkingDay {
  id: string;
  scheduleId: string;
  day: DayOfWeek;
  isOpen: boolean;
  hours: HourRange[];
}

export interface Schedule {
  id: string;
  shopId: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  days: WorkingDay[];
}

export interface CreateScheduleDto {
  startDate: string;
  isActive?: boolean;
}

export interface UpdateScheduleDto {
  startDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

export interface UpsertDaysDto {
  days: {
    day: DayOfWeek;
    isOpen: boolean;
    hours?: HourRange[];
  }[];
}

export const getSchedules = (shopId: string) =>
  client.get(`/api/shops/${shopId}/schedules`).then((r) => r.data.data as Schedule[]);

export const getSchedule = (shopId: string, scheduleId: string) =>
  client.get(`/api/shops/${shopId}/schedules/${scheduleId}`).then((r) => r.data.data as Schedule);

export const createSchedule = (shopId: string, dto: CreateScheduleDto) =>
  client.post(`/api/shops/${shopId}/schedules`, dto).then((r) => r.data.data as Schedule);

export const updateSchedule = (shopId: string, scheduleId: string, dto: UpdateScheduleDto) =>
  client.patch(`/api/shops/${shopId}/schedules/${scheduleId}`, dto).then((r) => r.data.data as Schedule);

export const deleteSchedule = (shopId: string, scheduleId: string) =>
  client.delete(`/api/shops/${shopId}/schedules/${scheduleId}`).then((r) => r.data);

export const upsertDays = (shopId: string, scheduleId: string, dto: UpsertDaysDto) =>
  client.put(`/api/shops/${shopId}/schedules/${scheduleId}/days`, dto).then((r) => r.data.data as Schedule);

// Staff schedule variants — route through /team/:memberId/schedules
export const getStaffSchedules = (shopId: string, memberId: string) =>
  client.get(`/api/shops/${shopId}/team/${memberId}/schedules`).then((r) => r.data.data as Schedule[]);

export const createStaffSchedule = (shopId: string, memberId: string, dto: CreateScheduleDto) =>
  client.post(`/api/shops/${shopId}/team/${memberId}/schedules`, dto).then((r) => r.data.data as Schedule);

export const deleteStaffSchedule = (shopId: string, memberId: string, scheduleId: string) =>
  client.delete(`/api/shops/${shopId}/team/${memberId}/schedules/${scheduleId}`).then((r) => r.data);

export const upsertStaffDays = (shopId: string, memberId: string, scheduleId: string, dto: UpsertDaysDto) =>
  client
    .put(`/api/shops/${shopId}/team/${memberId}/schedules/${scheduleId}/days`, dto)
    .then((r) => r.data.data as Schedule);
