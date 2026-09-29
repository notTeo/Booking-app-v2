import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { lockProvider } from '../utils/serializable';

// lockProvider is what makes bookings for one provider queue instead of
// colliding (see BOOKING_TX_ISOLATION). These tests pin its behaviour.

const withShortLockTimeout = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) => {
  await tx.$executeRaw`select set_config('lock_timeout', '300', true)`;
};

describe('lockProvider', () => {
  it('makes a second writer for the SAME provider wait until the first finishes', async () => {
    let releaseFirst!: () => void;
    const firstHolds = new Promise<void>((r) => (releaseFirst = r));
    let firstHasLock!: () => void;
    const locked = new Promise<void>((r) => (firstHasLock = r));

    const first = prisma.$transaction(async (tx) => {
      await lockProvider(tx, 'provider-a');
      firstHasLock();
      await firstHolds;
    });
    await locked;

    // While the first still holds it, the second cannot get in (lock timeout).
    const blocked = await prisma
      .$transaction(async (tx) => {
        await withShortLockTimeout(tx);
        await lockProvider(tx, 'provider-a');
      })
      .then(
        () => 'acquired',
        () => 'blocked',
      );
    expect(blocked).toBe('blocked');

    // Once the first finishes, the lock is free again.
    releaseFirst();
    await first;
    await prisma.$transaction(async (tx) => {
      await withShortLockTimeout(tx);
      await lockProvider(tx, 'provider-a');
    });
  });

  it('does not block a different provider', async () => {
    let releaseFirst!: () => void;
    const firstHolds = new Promise<void>((r) => (releaseFirst = r));
    let firstHasLock!: () => void;
    const locked = new Promise<void>((r) => (firstHasLock = r));

    const first = prisma.$transaction(async (tx) => {
      await lockProvider(tx, 'provider-a');
      firstHasLock();
      await firstHolds;
    });
    await locked;

    await prisma.$transaction(async (tx) => {
      await withShortLockTimeout(tx);
      await lockProvider(tx, 'provider-b');
    });

    releaseFirst();
    await first;
  });
});
