import { useQuery } from '@tanstack/react-query';
import { getMyInvites } from '../api/invite.api';

export const MY_INVITES_KEY = ['my-invites'] as const;

// Feeds the sidebar's "My invites" item and badge. InvitesPage invalidates
// this key after accept/decline so the badge never lags behind the inbox.
export function useMyInvites() {
  return useQuery({
    queryKey: MY_INVITES_KEY,
    queryFn: getMyInvites,
    staleTime: 60_000,
    retry: 1,
  });
}
