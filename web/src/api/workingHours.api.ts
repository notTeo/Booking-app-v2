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
  endDate?: string;
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

/** memberId -> that day's opening ranges, or null when the member is closed
 * (no active schedule, day off, or outside the schedule's dates). Every
 * member of the shop is included, even inactive or login-less ones. */
export type DaySchedule = Record<string, HourRange[] | null>;

export const getDaySchedule = (shopId: string, date: string) =>
  client
    .get(`/api/shops/${shopId}/schedules/day`, { params: { date } })
    .then((r) => r.data.data as DaySchedule);

// Working hours belong to team members: everything routes through /team/:memberId/schedules
export const getStaffSchedules = (shopId: string, memberId: string) =>
  client.get(`/api/shops/${shopId}/team/${memberId}/schedules`).then((r) => r.data.data as Schedule[]);

export const createStaffSchedule = (shopId: string, memberId: string, dto: CreateScheduleDto) =>
  client.post(`/api/shops/${shopId}/team/${memberId}/schedules`, dto).then((r) => r.data.data as Schedule);

export const deleteStaffSchedule = (shopId: string, memberId: string, scheduleId: string) =>
  client.delete(`/api/shops/${shopId}/team/${memberId}/schedules/${scheduleId}`).then((r) => r.data);

export const updateStaffSchedule = (shopId: string, memberId: string, scheduleId: string, dto: UpdateScheduleDto) =>
  client
    .patch(`/api/shops/${shopId}/team/${memberId}/schedules/${scheduleId}`, dto)
    .then((r) => r.data.data as Schedule);

export const upsertStaffDays = (shopId: string, memberId: string, scheduleId: string, dto: UpsertDaysDto) =>
  client
    .put(`/api/shops/${shopId}/team/${memberId}/schedules/${scheduleId}/days`, dto)
    .then((r) => r.data.data as Schedule);
