import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!host && !redisUrl) {
      this.logger.warn('REDIS_HOST / REDIS_URL no configurados. Servidor operando en modo seguro sin caché Redis.');
      return;
    }

    try {
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });
      } else {
        this.client = new Redis({
          host,
          port: port ? Number(port) : 6379,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        });
      }

      this.client.on('error', (err) => {
        this.logger.warn(`Aviso de conexión Redis: ${err.message}`);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Conectado exitosamente a Redis');
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (err: any) {
      this.logger.warn(`No se pudo conectar a Redis (${err?.message || err}). Continuando en modo tolerante a fallos.`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignorar error al desconectar
      }
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  // Métodos de ayuda seguros
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Ignorar fallo de caché
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.del(key);
    } catch {
      // Ignorar fallo de caché
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;
    try {
      return (await this.client.exists(key)) === 1;
    } catch {
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.expire(key, seconds);
    } catch {
      // Ignorar fallo de caché
    }
  }
}