import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// A request body must never reach Prisma whole: a body `shopId` or a nested
// relation write then lands in another shop (audit TI-01/TI-02). Services take
// fields by name; this fails if a spread of a request object comes back.
describe('no request-body pass-through to Prisma', () => {
  const dir = join(__dirname, '../services');
  const files = readdirSync(dir).filter((f) => f.endsWith('.service.ts'));

  it.each(files)('%s picks fields by name', (file) => {
    const src = readFileSync(join(dir, file), 'utf8');
    const spreads =
      src.match(
        /\.\.\.(dto|body|h)\b|data:\s*(dto|body)\s*[,}]|create:\s*hours\s*[,}]/g,
      ) ?? [];
    expect(spreads).toEqual([]);
  });
});
