import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // Create a PostgreSQL connection pool using the DATABASE_URL
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    // Create the Prisma adapter
    const adapter = new PrismaPg(pool);
    // Pass the adapter to the PrismaClient constructor
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}