import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    // Conexión establecida automáticamente por NestJS
  }

  async onModuleDestroy() {
    await this.connection.close();
  }

  getDb(): Connection {
    return this.connection;
  }
}