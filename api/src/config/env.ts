import dotenv from 'dotenv';
import { parseEnv } from './parseEnv';

dotenv.config();

const parsed = parseEnv(process.env);
if (!parsed.env) {
  console.error(
    `[env] Invalid environment configuration:\n  ${parsed.errors.join('\n  ')}`,
  );
  process.exit(1);
}

export const env = parsed.env;
