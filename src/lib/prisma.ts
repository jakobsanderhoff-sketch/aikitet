import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const url = process.env.DATABASE_URL || '';
  const logConfig = process.env.NODE_ENV === 'development' ? ['error', 'warn'] as const : ['error'] as const;

  // Prisma Postgres proxy (prisma+postgres://) — use as accelerateUrl
  if (url.startsWith('prisma+postgres://')) {
    return new PrismaClient({
      log: [...logConfig],
      accelerateUrl: url,
    } as any);
  }

  // Direct PostgreSQL connection — use pg driver adapter
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: [...logConfig],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
