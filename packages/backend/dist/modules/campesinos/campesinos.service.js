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
exports.CampesinosService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const postgres_storage_service_1 = require("../../database/postgres-storage.service");
const prisma_service_1 = require("../../database/prisma.service");
const cedula_code_util_1 = require("../../common/utils/cedula-code.util");
let CampesinosService = class CampesinosService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async resolveConsejoUuid(value) {
        if (value == null || value === '') {
            return null;
        }
        const textValue = String(value).trim();
        if (!textValue) {
            return null;
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT consejo_id
      FROM operacional.consejos
      WHERE consejo_id::text = ${textValue}
      LIMIT 1
    `);
        return rows[0]?.consejo_id ?? null;
    }
    async resolveUserUuid(value) {
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
    normalizeDateInput(value) {
        if (!value) {
            return undefined;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T00:00:00.000Z`);
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    async resolveParroquiaId(input) {
        if (input.parroquiaId != null) {
            return input.parroquiaId;
        }
        if (input.municipioId != null) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_parroquia
        FROM catalogos.parroquias
        WHERE municipio = ${input.municipioId}
        ORDER BY id_parroquia
        LIMIT 1
      `);
            if (rows[0]?.id_parroquia != null) {
                return rows[0].id_parroquia;
            }
        }
        if (input.estadoId != null) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT p.id_parroquia
        FROM catalogos.parroquias p
        INNER JOIN catalogos.municipios m ON m.id_municipio = p.municipio
        WHERE m.estado = ${input.estadoId}
        ORDER BY p.id_parroquia
        LIMIT 1
      `);
            if (rows[0]?.id_parroquia != null) {
                return rows[0].id_parroquia;
            }
        }
        const fallback = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_parroquia
      FROM catalogos.parroquias
      ORDER BY id_parroquia
      LIMIT 1
    `);
        return fallback[0]?.id_parroquia ?? 1;
    }
    async resolveGeneroId(genero) {
        const cleaned = genero?.trim();
        if (cleaned && /^\d+$/.test(cleaned)) {
            return Number(cleaned);
        }
        if (cleaned) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_genero
        FROM catalogos.generos
        WHERE LOWER(genero) = LOWER(${cleaned})
        ORDER BY id_genero
        LIMIT 1
      `);
            if (rows[0]?.id_genero != null) {
                return rows[0].id_genero;
            }
        }
        const fallback = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_genero
      FROM catalogos.generos
      ORDER BY id_genero
      LIMIT 1
    `);
        return fallback[0]?.id_genero ?? 1;
    }
    isValidCampesinoCedula(value) {
        return /^([VE]-\d{6,9}|[A-Z]\d{3})$/.test(value);
    }
    randomNoCedulaCode() {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const digits = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `${letter}${digits}`;
    }
    async generateUniqueCedula() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = this.randomNoCedulaCode();
            const existing = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT cedula
        FROM registros.personas
        WHERE cedula = ${candidate}
        LIMIT 1
      `);
            if (!existing[0]) {
                return candidate;
            }
        }
        return this.randomNoCedulaCode();
    }
    buildCedulaData(value) {
        if (!value) {
            return { tipoCedula: 'NP', cedula: '' };
        }
        const normalized = (0, cedula_code_util_1.normalizeCedulaInput)(value);
        const prefixedMatch = normalized.match(/^([VE])-(\d{6,9})$/);
        if (prefixedMatch) {
            return {
                tipoCedula: prefixedMatch[1],
                cedula: prefixedMatch[2],
            };
        }
        if (/^[A-Z]\d{3}$/.test(normalized)) {
            return { tipoCedula: 'NP', cedula: normalized };
        }
        if (/^\d{6,9}$/.test(normalized)) {
            return { tipoCedula: 'V', cedula: normalized };
        }
        return { tipoCedula: 'NP', cedula: '' };
    }
    formatCedulaForResponse(tipoCedula, cedula) {
        if (!cedula) {
            return '';
        }
        if (tipoCedula === 'V' || tipoCedula === 'E') {
            return `${tipoCedula}-${cedula}`;
        }
        return cedula;
    }
    async findCampesinoRow(identifier) {
        const textValue = String(identifier).trim();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        c.id_campesinos AS id,
        p.tipo_cedula,
        p.cedula,
        p.nombre,
        p.apellido,
        p.numero_telefonico AS telefono,
        p.email AS correo,
        p.fecha_nacimiento,
        g.genero AS genero,
        e.nombre_estado AS estado,
        m.nombre_municipio AS municipio,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.creado_por,
        c.asignado_a,
        c.formularios_pendientes AS tiene_pendientes,
        (
          SELECT jsonb_build_object(
            'formularios_respondidos',
            COALESCE(jsonb_agg(DISTINCT r.id_formulario::text), '[]'::jsonb)
          )
          FROM respuestas.respuesta_form r
          WHERE r.respuestas->>'campesino_id' = c.id_campesinos::text
        ) AS metadata,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM operacional.campesinos c
      LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      WHERE c.id_campesinos::text = ${textValue}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    mapCampesino(campesino) {
        return {
            id: campesino.id,
            cedula: this.formatCedulaForResponse(campesino.tipo_cedula, campesino.cedula),
            nombre: campesino.nombre,
            apellido: campesino.apellido,
            telefono: campesino.telefono,
            correo: campesino.correo,
            fecha_nacimiento: campesino.fecha_nacimiento,
            genero: campesino.genero || null,
            estado: campesino.estado,
            municipio: campesino.municipio,
            parroquia: campesino.parroquia,
            direccion: campesino.direccion,
            consejo_id: campesino.consejo_id ?? null,
            consejo_nombre: null,
            creado_por: campesino.creado_por ?? null,
            asignado_a: campesino.asignado_a ?? null,
            tiene_pendientes: Boolean(campesino.tiene_pendientes),
            metadata: campesino.metadata ?? { formularios_respondidos: [] },
            creado_en: campesino.creado_en,
            actualizado_en: campesino.actualizado_en ?? campesino.creado_en,
        };
    }
    async findAll(requester, consejoId) {
        if (requester.rol === 'encuestador') {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT p.consejo_id
        FROM seguridad.usuarios u
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        WHERE u.id_usuario::text = ${requester.id}
        LIMIT 1
      `);
            const currentConsejoId = rows[0]?.consejo_id ?? null;
            if (!currentConsejoId) {
                throw new common_1.ForbiddenException('El encuestador no tiene un consejo asignado');
            }
            const campesinos = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          c.id_campesinos AS id,
          p.tipo_cedula,
          p.cedula,
          p.nombre,
          p.apellido,
          p.numero_telefonico AS telefono,
          p.email AS correo,
          p.fecha_nacimiento,
          g.genero AS genero,
          e.nombre_estado AS estado,
          m.nombre_municipio AS municipio,
          par.nombre_parroquia AS parroquia,
          p.direccion_usuario AS direccion,
          p.consejo_id AS consejo_id,
          c.creado_por,
          c.asignado_a,
          c.formularios_pendientes AS tiene_pendientes,
          (
            SELECT jsonb_build_object(
              'formularios_respondidos',
              COALESCE(jsonb_agg(DISTINCT r.id_formulario::text), '[]'::jsonb)
            )
            FROM respuestas.respuesta_form r
            WHERE r.respuestas->>'campesino_id' = c.id_campesinos::text
          ) AS metadata,
          p.created_at AS creado_en,
          p.update_at AS actualizado_en
        FROM operacional.campesinos c
        LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
        LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
        LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
        LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
        LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
        WHERE p.consejo_id::text = ${String(currentConsejoId)}
        ORDER BY p.nombre
      `);
            return campesinos.map((campesino) => this.mapCampesino(campesino));
        }
        const resolvedConsejoId = await this.resolveConsejoUuid(consejoId);
        const campesinos = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        c.id_campesinos AS id,
        p.tipo_cedula,
        p.cedula,
        p.nombre,
        p.apellido,
        p.numero_telefonico AS telefono,
        p.email AS correo,
        p.fecha_nacimiento,
        g.genero AS genero,
        e.nombre_estado AS estado,
        m.nombre_municipio AS municipio,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.creado_por,
        c.asignado_a,
        c.formularios_pendientes AS tiene_pendientes,
        (
          SELECT jsonb_build_object(
            'formularios_respondidos',
            COALESCE(jsonb_agg(DISTINCT r.id_formulario::text), '[]'::jsonb)
          )
          FROM respuestas.respuesta_form r
          WHERE r.respuestas->>'campesino_id' = c.id_campesinos::text
        ) AS metadata,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM operacional.campesinos c
      LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      ${resolvedConsejoId ? client_1.Prisma.sql `WHERE p.consejo_id::text = ${resolvedConsejoId}` : client_1.Prisma.empty}
      ORDER BY p.nombre
    `);
        return campesinos.map((campesino) => this.mapCampesino(campesino));
    }
    async findOne(id, requester) {
        const campesino = await this.findCampesinoRow(id);
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        if (requester.rol === 'encuestador') {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT p.consejo_id
        FROM seguridad.usuarios u
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        WHERE u.id_usuario::text = ${requester.id}
        LIMIT 1
      `);
            if (!rows[0]?.consejo_id || rows[0].consejo_id !== campesino.consejo_id) {
                throw new common_1.ForbiddenException('No tiene permiso para ver este campesino');
            }
        }
        return this.mapCampesino(campesino);
    }
    async create(createCampesinDto, requesterId) {
        const trimmedNombre = createCampesinDto.nombre?.trim();
        if (!trimmedNombre) {
            throw new common_1.BadRequestException('El nombre del campesino es obligatorio');
        }
        let tipoCedula;
        let cedula;
        if (createCampesinDto.cedula) {
            const normalizedCedula = (0, cedula_code_util_1.normalizeCedulaInput)(createCampesinDto.cedula);
            if (!this.isValidCampesinoCedula(normalizedCedula)) {
                throw new common_1.BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
            }
            const parsedCedula = this.buildCedulaData(normalizedCedula);
            tipoCedula = parsedCedula.tipoCedula;
            cedula = parsedCedula.cedula;
        }
        else {
            tipoCedula = 'NP';
            cedula = await this.generateUniqueCedula();
        }
        const parroquiaId = await this.resolveParroquiaId({
            parroquiaId: createCampesinDto.parroquia_id,
            municipioId: createCampesinDto.municipio_id,
            estadoId: createCampesinDto.estado_id,
        });
        const generoId = await this.resolveGeneroId(createCampesinDto.genero);
        const consejoId = await this.resolveConsejoUuid(createCampesinDto.consejo_id);
        const creadoPor = await this.resolveUserUuid(createCampesinDto.creado_por ?? requesterId ?? null);
        const asignadoA = await this.resolveUserUuid(createCampesinDto.asignado_a ?? null);
        const fechaNacimiento = this.normalizeDateInput(createCampesinDto.fecha_nacimiento) ?? new Date('1990-01-01T00:00:00.000Z');
        const personId = (0, crypto_1.randomUUID)();
        await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw(client_1.Prisma.sql `
        INSERT INTO registros.personas (
          id_personas,
          nombre,
          apellido,
          tipo_cedula,
          cedula,
          fecha_nacimiento,
          parroquia,
          direccion_usuario,
          email,
          numero_telefonico,
          genero,
          consejo_id
        ) VALUES (
          CAST(${personId} AS uuid),
          ${trimmedNombre},
          ${createCampesinDto.apellido?.trim() || ''},
          CAST(${tipoCedula} AS registros.tipo_cedula_enum),
          ${cedula},
          ${fechaNacimiento},
          ${parroquiaId},
          ${createCampesinDto.direccion?.trim() || ''},
          ${createCampesinDto.correo?.trim() || null},
          ${createCampesinDto.telefono?.trim() || null},
          ${generoId},
          CAST(${consejoId} AS uuid)
        )
      `);
            await tx.$queryRaw(client_1.Prisma.sql `
        INSERT INTO operacional.campesinos (
          id_campesinos,
          creado_por,
          asignado_a,
          formularios_pendientes
        ) VALUES (
          CAST(${personId} AS uuid),
          CAST(${creadoPor} AS uuid),
          CAST(${asignadoA} AS uuid),
          ${createCampesinDto.tiene_pendientes ?? false}
        )
      `);
        });
        const created = await this.findCampesinoRow(personId);
        if (!created) {
            throw new common_1.NotFoundException('No se pudo crear el campesino');
        }
        return this.mapCampesino(created);
    }
    async update(id, updateCampesinDto) {
        const campesino = await this.findCampesinoRow(id);
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        let cedula = null;
        let tipoCedula = null;
        if (updateCampesinDto.cedula != null) {
            const normalizedCedula = (0, cedula_code_util_1.normalizeCedulaInput)(updateCampesinDto.cedula);
            if (!this.isValidCampesinoCedula(normalizedCedula)) {
                throw new common_1.BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
            }
            const parsedCedula = this.buildCedulaData(normalizedCedula);
            cedula = parsedCedula.cedula;
            tipoCedula = parsedCedula.tipoCedula;
        }
        const parroquiaId = (updateCampesinDto.parroquia_id != null || updateCampesinDto.municipio_id != null || updateCampesinDto.estado_id != null)
            ? await this.resolveParroquiaId({
                parroquiaId: updateCampesinDto.parroquia_id,
                municipioId: updateCampesinDto.municipio_id,
                estadoId: updateCampesinDto.estado_id,
            })
            : null;
        const generoId = updateCampesinDto.genero != null
            ? await this.resolveGeneroId(updateCampesinDto.genero)
            : null;
        const consejoId = updateCampesinDto.consejo_id != null
            ? await this.resolveConsejoUuid(updateCampesinDto.consejo_id)
            : null;
        const creadoPor = updateCampesinDto.creado_por != null
            ? await this.resolveUserUuid(updateCampesinDto.creado_por)
            : null;
        const asignadoA = updateCampesinDto.asignado_a != null
            ? await this.resolveUserUuid(updateCampesinDto.asignado_a)
            : null;
        const fechaNacimiento = updateCampesinDto.fecha_nacimiento != null
            ? (this.normalizeDateInput(updateCampesinDto.fecha_nacimiento) ?? null)
            : null;
        await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw(client_1.Prisma.sql `
        UPDATE registros.personas
        SET
          nombre = COALESCE(${updateCampesinDto.nombre?.trim() ?? null}, nombre),
          apellido = COALESCE(${updateCampesinDto.apellido?.trim() ?? null}, apellido),
          tipo_cedula = CASE
            WHEN CAST(${tipoCedula ?? null} AS text) IS NULL THEN tipo_cedula
            ELSE CAST(${tipoCedula ?? null} AS registros.tipo_cedula_enum)
          END,
          cedula = COALESCE(CAST(${cedula ?? null} AS text), cedula),
          fecha_nacimiento = COALESCE(CAST(${fechaNacimiento ?? null} AS date), fecha_nacimiento),
          parroquia = COALESCE(CAST(${parroquiaId ?? null} AS integer), parroquia),
          direccion_usuario = COALESCE(${updateCampesinDto.direccion?.trim() ?? null}, direccion_usuario),
          email = COALESCE(${updateCampesinDto.correo?.trim() ?? null}, email),
          numero_telefonico = COALESCE(${updateCampesinDto.telefono?.trim() ?? null}, numero_telefonico),
          genero = COALESCE(CAST(${generoId ?? null} AS integer), genero),
          consejo_id = CASE
            WHEN CAST(${consejoId ?? null} AS text) IS NULL THEN consejo_id
            ELSE CAST(${consejoId ?? null} AS uuid)
          END,
          update_at = NOW()
        WHERE id_personas::text = ${String(campesino.id)}
      `);
            await tx.$queryRaw(client_1.Prisma.sql `
        UPDATE operacional.campesinos
        SET
          creado_por = CASE
            WHEN CAST(${creadoPor ?? null} AS text) IS NULL THEN creado_por
            ELSE CAST(${creadoPor ?? null} AS uuid)
          END,
          asignado_a = CASE
            WHEN CAST(${asignadoA ?? null} AS text) IS NULL THEN asignado_a
            ELSE CAST(${asignadoA ?? null} AS uuid)
          END,
          formularios_pendientes = COALESCE(CAST(${updateCampesinDto.tiene_pendientes ?? null} AS boolean), formularios_pendientes)
        WHERE id_campesinos::text = ${String(campesino.id)}
      `);
        });
        const updated = await this.findCampesinoRow(campesino.id);
        if (!updated) {
            throw new common_1.NotFoundException('No se pudo actualizar el campesino');
        }
        return this.mapCampesino(updated);
    }
    async remove(id) {
        const campesino = await this.findCampesinoRow(id);
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      DELETE FROM registros.personas WHERE id_personas::text = ${String(campesino.id)}
    `);
        return { deleted: true };
    }
    async saveProfileImage(id, dto) {
        return { id, saved: true, payload: dto };
    }
    async getProfileImage(id) {
        return { id, image: null };
    }
    async deleteProfileImage(id) {
        return { id, deleted: true };
    }
};
exports.CampesinosService = CampesinosService;
exports.CampesinosService = CampesinosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        postgres_storage_service_1.PostgresStorageService])
], CampesinosService);
//# sourceMappingURL=campesinos.service.js.map