import { useQuery } from '@tanstack/react-query';
import { getMyShops } from '../api/shop.api';

export const MY_SHOPS_KEY = ['my-shops'] as const;

// The signed-in user's active shops, each with their role there. Shared by the
// dashboard and the post-login landing (utils/landing.ts).
export function useMyShops() {
  return useQuery({
    queryKey: MY_SHOPS_KEY,
    queryFn: getMyShops,
    retry: 1,
  });
}
