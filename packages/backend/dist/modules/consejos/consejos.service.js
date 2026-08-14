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
exports.ConsejosService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let ConsejosService = class ConsejosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async resolveUsuarioUuid(value) {
        if (value == null || value === '') {
            return null;
        }
        const textValue = String(value).trim();
        if (!textValue) {
            return null;
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_usuario FROM seguridad.usuarios WHERE id_usuario::text = ${textValue} LIMIT 1
    `);
        return rows[0]?.id_usuario ?? null;
    }
    async mapConsejo(consejo) {
        return {
            id: consejo.consejo_id,
            nombre: consejo.nombre_consejo,
            descripcion: consejo.descripcion,
            estado: consejo.estado,
            municipio: consejo.municipio,
            parroquia: consejo.parroquia,
            encargado_tipo: consejo.encargado_rol || 'usuario',
            encargado_id: consejo.encargado_id ?? null,
            encargado_nombre: consejo.encargado_nombre ?? null,
            creado_en: consejo.created_at,
            actualizado_en: consejo.updated_at,
        };
    }
    async findAll() {
        const consejos = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        c.consejo_id,
        c.nombre_consejo,
        c.descripcion,
        e.nombre_estado AS estado,
        m.nombre_municipio AS municipio,
        par.nombre_parroquia AS parroquia,
        c.encargado_id,
        CONCAT(p.nombre, ' ', p.apellido) AS encargado_nombre,

        r.tip_rol AS encargado_rol,
        c.created_at,
        c.updated_at
      FROM operacional.consejos c
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = c.parrroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN seguridad.usuarios u ON u.id_usuario = c.encargado_id
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      ORDER BY c.nombre_consejo
    `);
        return Promise.all(consejos.map((consejo) => this.mapConsejo(consejo)));
    }
    async findOne(id) {
        const textId = String(id).trim();
        const consejo = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        c.consejo_id,
        c.nombre_consejo,
        c.descripcion,
        e.nombre_estado AS estado,
        m.nombre_municipio AS municipio,
        par.nombre_parroquia AS parroquia,
        c.encargado_id,
        CONCAT(p.nombre, ' ', p.apellido) AS encargado_nombre,

        r.tip_rol AS encargado_rol,
        c.created_at,
        c.updated_at
      FROM operacional.consejos c
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = c.parrroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN seguridad.usuarios u ON u.id_usuario = c.encargado_id
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      WHERE c.consejo_id::text = ${textId}
      LIMIT 1
    `);
        if (!consejo[0]) {
            throw new common_1.NotFoundException('Consejo no encontrado');
        }
        return this.mapConsejo(consejo[0]);
    }
    async create(createConsejoDto) {
        const existing = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT consejo_id FROM operacional.consejos WHERE LOWER(nombre_consejo) = LOWER(${createConsejoDto.nombre}) LIMIT 1
    `);
        if (existing[0]) {
            throw new common_1.ConflictException('Ya existe un consejo con ese nombre');
        }
        const encargadoUuid = await this.resolveUsuarioUuid(createConsejoDto.encargado_id);
        const created = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO operacional.consejos (nombre_consejo, descripcion, parrroquia, direccion_csj, encargado_id)
      VALUES (
        ${createConsejoDto.nombre},
        ${createConsejoDto.descripcion ?? null},
        ${createConsejoDto.parroquia_id ?? 1},
        ${null},
        CAST(${encargadoUuid ?? null} AS uuid)
      )
      RETURNING consejo_id, nombre_consejo, descripcion, parrroquia, encargado_id, created_at, updated_at
    `);
        return this.mapConsejo(created[0]);
    }
    async update(id, updateConsejoDto) {
        const textId = String(id).trim();
        const current = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT consejo_id FROM operacional.consejos WHERE consejo_id::text = ${textId} LIMIT 1
    `);
        if (!current[0]) {
            throw new common_1.NotFoundException('Consejo no encontrado');
        }
        const encargadoUuid = updateConsejoDto.encargado_id != null ? await this.resolveUsuarioUuid(updateConsejoDto.encargado_id) : null;
        const updated = await this.prisma.$queryRaw(client_1.Prisma.sql `
      UPDATE operacional.consejos
      SET
        nombre_consejo = COALESCE(${updateConsejoDto.nombre ?? null}, nombre_consejo),
        descripcion = COALESCE(${updateConsejoDto.descripcion ?? null}, descripcion),
        parrroquia = COALESCE(${updateConsejoDto.parroquia_id ?? null}, parrroquia),
        direccion_csj = COALESCE(${null}, direccion_csj),
        encargado_id = COALESCE(CAST(${encargadoUuid ?? null} AS uuid), encargado_id)
      WHERE consejo_id::text = ${String(current[0].consejo_id)}
      RETURNING consejo_id, nombre_consejo, descripcion, parrroquia, encargado_id, created_at, updated_at
    `);
        return this.mapConsejo(updated[0]);
    }
    async remove(id) {
        const textId = String(id).trim();
        const current = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT consejo_id FROM operacional.consejos WHERE consejo_id::text = ${textId} LIMIT 1
    `);
        if (!current[0]) {
            throw new common_1.NotFoundException('Consejo no encontrado');
        }
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      DELETE FROM operacional.consejos WHERE consejo_id::text = ${String(current[0].consejo_id)}
    `);
        return { deleted: true };
    }
};
exports.ConsejosService = ConsejosService;
exports.ConsejosService = ConsejosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConsejosService);
//# sourceMappingURL=consejos.service.js.map