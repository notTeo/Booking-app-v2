import { PrismaClient } from '../../dist/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Pin every connection's session timezone to UTC. Prisma's pg adapter sends
// Dates as timezone-less strings, which Postgres interprets in the SESSION
// zone; with timestamptz columns that stores the wrong instant whenever the
// database's default zone isn't UTC (e.g. a dev machine, or a database
// restored from elsewhere). Prisma's own read path hides the error, so it
// only shows up to anything that reads the columns another way.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  options: '-c timezone=UTC',
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
