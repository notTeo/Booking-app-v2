// Dev-only scripts (demo/visual-check seeds) create users with known
// passwords. They must never touch a production database, so they run only
// when NODE_ENV is explicitly development or test — unset counts as unsafe.
export const assertDevEnvironment = (
  nodeEnv: string | undefined,
  scriptName: string,
): void => {
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(
      `${scriptName} is dev-only and refuses to run with NODE_ENV=${nodeEnv ?? '(unset)'}. ` +
        'Set NODE_ENV=development (in api/.env) to run it against a local database.',
    );
  }
};
