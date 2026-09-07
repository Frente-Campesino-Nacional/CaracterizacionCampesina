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
const client_1 = require("@prisma/client");
const postgres_storage_service_1 = require("../../database/postgres-storage.service");
const prisma_service_1 = require("../../database/prisma.service");
let FormulariosService = class FormulariosService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async findFormularioRow(identifier) {
        const textValue = String(identifier).trim();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        id_formulario AS id,
        titulo,
        version,
        estructura,
        activo,
        creado_por,
        created_at AS creado_en,
        update_at AS actualizado_en
      FROM operacional.formularios
      WHERE id_formulario::text = ${textValue}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    mapFormulario(formulario) {
        return {
            id: formulario.id,
            titulo: formulario.titulo,
            version: formulario.version,
            estructura: formulario.estructura,
            activo: formulario.activo,
            creado_por: formulario.creado_por ?? null,
            creado_en: formulario.creado_en,
            actualizado_en: formulario.actualizado_en,
        };
    }
    async findAll() {
        const formularios = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        id_formulario AS id,
        titulo,
        version,
        estructura,
        activo,
        creado_por,
        created_at AS creado_en,
        update_at AS actualizado_en
      FROM operacional.formularios
      WHERE activo = TRUE
      ORDER BY created_at DESC
    `);
        return formularios.map((formulario) => this.mapFormulario(formulario));
    }
    async findOne(id) {
        const formulario = await this.findFormularioRow(id);
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        return this.mapFormulario(formulario);
    }
    async create(createFormularioDto) {
        const created = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO operacional.formularios (titulo, version, estructura, activo, creado_por)
      VALUES (
        ${createFormularioDto.titulo},
        ${createFormularioDto.version ?? 1},
        ${JSON.stringify(createFormularioDto.estructura ?? {})}::jsonb,
        ${createFormularioDto.activo ?? true},
        CAST(${createFormularioDto.creado_por ?? null} AS uuid)
      )
      RETURNING id_formulario AS id, titulo, version, estructura, activo, creado_por, created_at AS creado_en, update_at AS actualizado_en
    `);
        return this.mapFormulario(created[0]);
    }
    async update(id, updateFormularioDto) {
        const formulario = await this.findFormularioRow(id);
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        const updated = await this.prisma.$queryRaw(client_1.Prisma.sql `
      UPDATE operacional.formularios
      SET
        titulo = COALESCE(${updateFormularioDto.titulo ?? null}, titulo),
        version = COALESCE(${updateFormularioDto.version ?? null}, version),
        estructura = COALESCE(${updateFormularioDto.estructura ? JSON.stringify(updateFormularioDto.estructura) : null}::jsonb, estructura),
        activo = COALESCE(${updateFormularioDto.activo ?? null}, activo)
      WHERE id_formulario::text = ${String(formulario.id)}
      RETURNING id_formulario AS id, titulo, version, estructura, activo, creado_por, created_at AS creado_en, update_at AS actualizado_en
    `);
        return this.mapFormulario(updated[0] ?? formulario);
    }
    async remove(id) {
        const formulario = await this.findFormularioRow(id);
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      DELETE FROM operacional.formularios WHERE id_formulario::text = ${String(formulario.id)}
    `);
        return { deleted: true };
    }
    async submitRespuesta(formularioId, dto, requesterId) {
        const formulario = await this.findFormularioRow(formularioId);
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        const encuestadorId = dto.encuestador_id ?? requesterId ?? null;
        const campesinoId = dto.campesino_id ?? null;
        const storageId = await this.storageService.saveFormularioRespuesta({
            formularioId: formulario.id,
            campesinoId: campesinoId ?? null,
            encuestadorId: encuestadorId ?? null,
            respuestas: dto.respuestas,
            metadata: dto.metadata,
            capturadoEn: dto.capturado_en ? new Date(dto.capturado_en) : undefined,
        });
        if (!storageId) {
            throw new common_1.ServiceUnavailableException('No se pudo persistir la respuesta en PostgreSQL. Intenta nuevamente.');
        }
        if (campesinoId) {
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE operacional.campesinos c
        SET formularios_pendientes = EXISTS (
          SELECT 1
          FROM operacional.formularios f
          WHERE f.activo = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM respuestas.respuesta_form r
              WHERE r.id_formulario = f.id_formulario
                AND r.respuestas->>'campesino_id' = c.id_campesinos::text
            )
        )
        WHERE c.id_campesinos::text = ${String(campesinoId)}
      `);
        }
        return {
            formulario_id: formulario.id,
            guardado_en_postgres: true,
            registro_id: storageId,
        };
    }
    async listFilterQuestions() {
        const formularios = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_formulario AS id, titulo, estructura
      FROM operacional.formularios
      WHERE activo = TRUE
      ORDER BY created_at DESC
    `);
        const results = [];
        for (const formulario of formularios) {
            const estructura = formulario.estructura;
            const preguntas = Array.isArray(estructura?.preguntas) ? estructura.preguntas : [];
            for (const question of preguntas) {
                if (!question || typeof question !== 'object' || Array.isArray(question)) {
                    continue;
                }
                const useAsFilter = Boolean(question.use_as_filter ?? question.usar_como_filtro ?? question.useAsFilter ?? false);
                if (!useAsFilter) {
                    continue;
                }
                const preguntaId = String(question.id ?? question.key ?? question.name ?? '').trim();
                const preguntaLabel = String(question.label ?? question.etiqueta ?? question.titulo ?? '').trim();
                if (!preguntaId || !preguntaLabel) {
                    continue;
                }
                results.push({
                    formulario_id: formulario.id,
                    formulario_titulo: formulario.titulo,
                    pregunta_id: preguntaId,
                    pregunta_label: preguntaLabel,
                });
            }
        }
        return results;
    }
    async listFilterResults(formularioId, preguntaId) {
        const formulario = await this.findFormularioRow(formularioId);
        if (!formulario) {
            throw new common_1.NotFoundException('Formulario no encontrado');
        }
        const structure = formulario.estructura;
        const preguntas = Array.isArray(structure?.preguntas) ? structure?.preguntas : [];
        const selectedQuestion = preguntas.find((item) => {
            const id = String(item?.id ?? item?.key ?? item?.name ?? '').trim();
            return id === preguntaId;
        });
        if (!selectedQuestion) {
            throw new common_1.NotFoundException('Pregunta de filtro no encontrada en el formulario');
        }
        const selectedLabel = String(selectedQuestion.label ?? selectedQuestion.etiqueta ?? selectedQuestion.titulo ?? preguntaId).trim();
        const responseRows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT respuestas, created_at
      FROM respuestas.respuesta_form
      WHERE id_formulario = CAST(${String(formulario.id)} AS uuid)
      ORDER BY created_at DESC;
    `);
        const byCampesino = new Map();
        for (const row of responseRows) {
            const payload = row.respuestas && typeof row.respuestas === 'object' && !Array.isArray(row.respuestas)
                ? row.respuestas
                : null;
            if (!payload) {
                continue;
            }
            const campesinoId = String(payload.campesino_id ?? '').trim();
            if (!campesinoId) {
                continue;
            }
            const answerRoot = payload.respuestas && typeof payload.respuestas === 'object' && !Array.isArray(payload.respuestas)
                ? payload.respuestas
                : null;
            if (!answerRoot) {
                continue;
            }
            const answerValue = answerRoot[preguntaId];
            if (!this.hasCompletedValue(answerValue)) {
                continue;
            }
            if (byCampesino.has(campesinoId)) {
                continue;
            }
            byCampesino.set(campesinoId, {
                valor: this.formatAnswerValue(answerValue),
                capturado_en: row.created_at ? row.created_at.toISOString() : null,
            });
        }
        const campesinoIds = Array.from(byCampesino.keys());
        if (!campesinoIds.length) {
            return [];
        }
        const campesinos = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        c.id_campesinos AS id,
        p.cedula,
        p.nombre,
        p.apellido,
        p.numero_telefonico AS telefono,
        p.email,
        p.consejo_id,
        co.nombre_consejo AS consejo_nombre,
        est.nombre_estado AS estado,
        mun.nombre_municipio AS municipio,
        par.nombre_parroquia AS parroquia
      FROM operacional.campesinos c
      LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
      LEFT JOIN operacional.consejos co ON co.consejo_id::text = p.consejo_id::text
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios mun ON mun.id_municipio = par.municipio
      LEFT JOIN catalogos.estados est ON est.id_estados = mun.estado
      WHERE c.id_campesinos::text = ANY (${campesinoIds})
    `);
        return campesinos
            .map((campesino) => {
            const answer = byCampesino.get(campesino.id);
            if (!answer) {
                return null;
            }
            return {
                campesino_id: campesino.id,
                cedula: campesino.cedula,
                nombre: campesino.nombre,
                apellido: campesino.apellido,
                telefono: campesino.telefono || null,
                email: campesino.email || null,
                consejo_nombre: campesino.consejo_nombre || null,
                estado: campesino.estado || null,
                municipio: campesino.municipio || null,
                parroquia: campesino.parroquia || null,
                pregunta_id: preguntaId,
                pregunta_label: selectedLabel,
                formulario_titulo: formulario.titulo,
                valor: answer.valor,
                capturado_en: answer.capturado_en,
            };
        })
            .filter((item) => Boolean(item));
    }
    hasCompletedValue(value) {
        if (value == null) {
            return false;
        }
        if (typeof value === 'string') {
            return value.trim().length > 0;
        }
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value);
        }
        if (typeof value === 'boolean') {
            return true;
        }
        if (value && typeof value === 'object') {
            return Object.keys(value).length > 0;
        }
        return false;
    }
    formatAnswerValue(value) {
        if (value == null) {
            return '';
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (Array.isArray(value)) {
            return value.map((item) => String(item)).join(', ');
        }
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
};
exports.FormulariosService = FormulariosService;
exports.FormulariosService = FormulariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        postgres_storage_service_1.PostgresStorageService])
], FormulariosService);
//# sourceMappingURL=formularios.service.js.map