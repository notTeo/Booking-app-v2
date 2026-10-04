import { useQuery } from '@tanstack/react-query';
import { getMyInvites } from '../api/invite.api';

export const MY_INVITES_KEY = ['my-invites'] as const;

// The signed-in user's invites (`received` = pending, for them). Feeds the
// dashboard inbox; shared with the post-login landing (utils/landing.ts).
// Accepting or declining anywhere must invalidate or update this key.
export function useMyInvites() {
  return useQuery({
    queryKey: MY_INVITES_KEY,
    queryFn: getMyInvites,
    retry: 1,
  });
}
