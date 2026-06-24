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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let SyncService = class SyncService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        try {
            return await this.prisma.sincronizacion.findMany({
                orderBy: { creado_en: 'desc' },
                take: 100,
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
                return [];
            }
            throw error;
        }
    }
    async create(createSyncDto) {
        return this.prisma.sincronizacion.create({ data: createSyncDto });
    }
    async update(id, updateSyncDto) {
        const sync = await this.prisma.sincronizacion.findUnique({
            where: { id },
        });
        if (!sync) {
            throw new common_1.NotFoundException('Registro de sincronización no encontrado');
        }
        return this.prisma.sincronizacion.update({
            where: { id },
            data: updateSyncDto,
        });
    }
    async process(id) {
        const sync = await this.prisma.sincronizacion.findUnique({ where: { id } });
        if (!sync) {
            throw new common_1.NotFoundException('Registro de sincronización no encontrado');
        }
        return this.prisma.sincronizacion.update({
            where: { id },
            data: {
                estado: 'PROCESADO',
                procesado_en: new Date(),
            },
        });
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map