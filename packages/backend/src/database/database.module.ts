import { Global, Module } from '@nestjs/common';
import { PostgresStorageService } from './postgres-storage.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, PostgresStorageService],
  exports: [PrismaService, RedisService, PostgresStorageService],
})
export class DatabaseModule {}