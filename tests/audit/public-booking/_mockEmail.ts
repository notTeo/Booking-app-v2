// Replaces every export of the email service with a resolved stub so no real
// email is attempted (same idea as api/src/tests/publicCancel.test.ts).
export const stubEmail = async (
  importOriginal: () => Promise<unknown>,
): Promise<Record<string, unknown>> => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(mod).map(([k, v]) => [
      k,
      typeof v === 'function' ? vi.fn().mockResolvedValue(undefined) : v,
    ]),
  );
};
