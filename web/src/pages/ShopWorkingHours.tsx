import { useShop } from '../context/ShopContext';
import WorkingHoursPanel, { type WorkingHoursApi } from '../components/WorkingHoursPanel';
import BookingWindowCard from '../components/BookingWindowCard';
import * as whApi from '../api/workingHours.api';

export default function ShopWorkingHours() {
  const { shop, isLoading: shopLoading } = useShop();

  if (shopLoading) {
    return (
      <div className="working-hours-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!shop) return null;

  const api: WorkingHoursApi = {
    getSchedules: () => whApi.getSchedules(shop.id),
    createSchedule: (dto) => whApi.createSchedule(shop.id, dto),
    updateSchedule: (scheduleId, dto) => whApi.updateSchedule(shop.id, scheduleId, dto),
    deleteSchedule: (scheduleId) => whApi.deleteSchedule(shop.id, scheduleId),
    upsertDays: (scheduleId, dto) => whApi.upsertDays(shop.id, scheduleId, dto),
  };

  const isOwner = shop.role === 'owner';
  return (
    <WorkingHoursPanel
      api={api}
      isOwner={isOwner}
      beforeSchedules={<BookingWindowCard shop={shop} isOwner={isOwner} />}
    />
  );
}
