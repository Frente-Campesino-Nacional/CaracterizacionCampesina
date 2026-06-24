import { Global, Module } from '@nestjs/common';
import { MongoOptionalService } from './mongo-optional.service';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, MongoOptionalService],
  exports: [PrismaService, RedisService, MongoOptionalService],
})
export class DatabaseModule {}