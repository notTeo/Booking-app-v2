import client from './client';

export interface TimeOff {
  id: string;
  shopId: string;
  /** Team member id, or null when the whole shop is closed. */
  staffId: string | null;
  startDate: string;
  /** Last day off, inclusive. */
  endDate: string;
  /** "HH:mm"; both null = the whole day. */
  startTime: string | null;
  endTime: string | null;
  note: string | null;
}

/** A saved entry, with how many existing bookings fall inside it. */
export type SavedTimeOff = TimeOff & { affectedBookings: number };

export interface CreateTimeOffDto {
  staffId: string | null;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export type UpdateTimeOffDto = Partial<Omit<CreateTimeOffDto, 'staffId'>>;

/** Shop-wide time off, plus that member's own when `memberId` is given. */
export const getTimeOff = (shopId: string, memberId?: string) =>
  client
    .get(`/api/shops/${shopId}/time-off`, { params: memberId ? { memberId } : undefined })
    .then((r) => r.data.data as TimeOff[]);

export const createTimeOff = (shopId: string, dto: CreateTimeOffDto) =>
  client.post(`/api/shops/${shopId}/time-off`, dto).then((r) => r.data.data as SavedTimeOff);

export const updateTimeOff = (shopId: string, timeOffId: string, dto: UpdateTimeOffDto) =>
  client.patch(`/api/shops/${shopId}/time-off/${timeOffId}`, dto).then((r) => r.data.data as SavedTimeOff);

export const deleteTimeOff = (shopId: string, timeOffId: string) =>
  client.delete(`/api/shops/${shopId}/time-off/${timeOffId}`).then((r) => r.data);
