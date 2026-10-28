import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __siteguard_prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__siteguard_prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__siteguard_prisma = prisma;
}

export * from '@prisma/client';
