"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(RedisService_1.name);
        this.client = null;
        this.isConnected = false;
    }
    async onModuleInit() {
        const host = this.configService.get('REDIS_HOST');
        const port = this.configService.get('REDIS_PORT');
        const redisUrl = this.configService.get('REDIS_URL');
        if (!host && !redisUrl) {
            this.logger.warn('REDIS_HOST / REDIS_URL no configurados. Servidor operando en modo seguro sin caché Redis.');
            return;
        }
        try {
            if (redisUrl) {
                this.client = new ioredis_1.default(redisUrl, {
                    lazyConnect: true,
                    maxRetriesPerRequest: 1,
                    retryStrategy: () => null,
                });
            }
            else {
                this.client = new ioredis_1.default({
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
        }
        catch (err) {
            this.logger.warn(`No se pudo conectar a Redis (${err?.message || err}). Continuando en modo tolerante a fallos.`);
            this.isConnected = false;
        }
    }
    async onModuleDestroy() {
        if (this.client) {
            try {
                await this.client.quit();
            }
            catch {
            }
        }
    }
    getClient() {
        return this.client;
    }
    async get(key) {
        if (!this.client || !this.isConnected)
            return null;
        try {
            return await this.client.get(key);
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl) {
        if (!this.client || !this.isConnected)
            return;
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch {
        }
    }
    async del(key) {
        if (!this.client || !this.isConnected)
            return;
        try {
            await this.client.del(key);
        }
        catch {
        }
    }
    async exists(key) {
        if (!this.client || !this.isConnected)
            return false;
        try {
            return (await this.client.exists(key)) === 1;
        }
        catch {
            return false;
        }
    }
    async expire(key, seconds) {
        if (!this.client || !this.isConnected)
            return;
        try {
            await this.client.expire(key, seconds);
        }
        catch {
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map