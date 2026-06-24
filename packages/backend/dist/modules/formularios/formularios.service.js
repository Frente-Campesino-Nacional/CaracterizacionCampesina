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
exports.FormulariosService = void 0;
const common_1 = require("@nestjs/common");
const mongo_optional_service_1 = require("../../database/mongo-optional.service");
const prisma_service_1 = require("../../database/prisma.service");
let FormulariosService = class FormulariosService {
    constructor(prisma, mongoOptionalService) {
        this.prisma = prisma;
        this.mongoOptionalService = mongoOptionalService;
    }
    async findAll() {
        return this.prisma.formulario.findMany({
            where: { activo: true },
        });
    }
    async findOne(id) {
        const formulario = await this.prisma.formulario.findUnique({
            where: { id },
        });
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        return formulario;
    }
    async create(createFormularioDto) {
        return this.prisma.formulario.create({
            data: {
                ...createFormularioDto,
                activo: createFormularioDto.activo ?? true,
            },
        });
    }
    async update(id, updateFormularioDto) {
        const formulario = await this.prisma.formulario.findUnique({
            where: { id },
        });
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        return this.prisma.formulario.update({
            where: { id },
            data: updateFormularioDto,
        });
    }
    async remove(id) {
        const formulario = await this.prisma.formulario.findUnique({
            where: { id },
        });
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        return this.prisma.formulario.delete({ where: { id } });
    }
    async submitRespuesta(formularioId, dto) {
        if (!this.mongoOptionalService.isEnabled()) {
            throw new common_1.ServiceUnavailableException('MongoDB no esta disponible. Las respuestas de formularios se guardan en MongoDB.');
        }
        const formulario = await this.prisma.formulario.findUnique({
            where: { id: formularioId },
            select: { id: true },
        });
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        const mongoId = await this.mongoOptionalService.saveFormularioRespuesta({
            formularioId,
            campesinoId: dto.campesino_id,
            encuestadorId: dto.encuestador_id,
            respuestas: dto.respuestas,
            metadata: dto.metadata,
            capturadoEn: dto.capturado_en ? new Date(dto.capturado_en) : undefined,
        });
        if (!mongoId) {
            throw new common_1.ServiceUnavailableException('No se pudo persistir la respuesta en MongoDB. Intenta nuevamente.');
        }
        if (dto.campesino_id != null) {
            const camper = await this.prisma.campesino.findUnique({
                where: { id: dto.campesino_id },
                select: { id: true, metadata: true },
            });
            if (camper) {
                const currentMetadata = !camper.metadata || Array.isArray(camper.metadata)
                    ? {}
                    : camper.metadata;
                const rawCompleted = currentMetadata.formularios_respondidos;
                const completedIds = Array.isArray(rawCompleted)
                    ? rawCompleted
                        .map((item) => Number(item))
                        .filter((item) => Number.isFinite(item) && item > 0)
                    : [];
                const updatedIds = Array.from(new Set([...completedIds, formularioId]));
                const activeForms = await this.prisma.formulario.findMany({
                    where: { activo: true },
                    select: { id: true },
                });
                const activeFormIds = activeForms.map((item) => item.id);
                const tienePendientes = activeFormIds.some((id) => !updatedIds.includes(id));
                await this.prisma.campesino.update({
                    where: { id: dto.campesino_id },
                    data: {
                        metadata: {
                            ...currentMetadata,
                            formularios_respondidos: updatedIds,
                            ultima_actualizacion_formularios: new Date().toISOString(),
                        },
                        tiene_pendientes: tienePendientes,
                    },
                });
            }
        }
        return {
            formulario_id: formularioId,
            guardado_en_mongo: true,
            mongo_id: mongoId,
        };
    }
};
exports.FormulariosService = FormulariosService;
exports.FormulariosService = FormulariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mongo_optional_service_1.MongoOptionalService])
], FormulariosService);
//# sourceMappingURL=formularios.service.js.map