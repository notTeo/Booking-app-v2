import { useQuery } from '@tanstack/react-query';
import { getMyInvites } from '../api/invite.api';

export const MY_INVITES_KEY = ['my-invites'] as const;

// The signed-in user's invites. The key is shared with the post-login landing
// (utils/landing.ts); InvitesPage invalidates it after accept/decline.
export function useMyInvites() {
  return useQuery({
    queryKey: MY_INVITES_KEY,
    queryFn: getMyInvites,
    staleTime: 60_000,
    retry: 1,
  });
}
