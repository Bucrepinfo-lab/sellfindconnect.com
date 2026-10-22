import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function createPrismaAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma persistence.');
  }

  return new PrismaPg({ connectionString });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}