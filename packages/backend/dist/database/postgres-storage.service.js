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
var PostgresStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresStorageService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma_service_1 = require("./prisma.service");
let PostgresStorageService = PostgresStorageService_1 = class PostgresStorageService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PostgresStorageService_1.name);
    }
    async onModuleInit() {
        this.logger.log('Almacenamiento PostgreSQL disponible para respuestas y fotos.');
    }
    isEnabled() {
        return true;
    }
    buildStoredImageUrl(input) {
        if (input.imageUrl?.trim()) {
            return {
                url: input.imageUrl.trim(),
                contentType: input.contentType,
            };
        }
        if (input.imageBase64?.trim()) {
            const normalizedBase64 = input.imageBase64.trim();
            return {
                url: `data:${input.contentType};base64,${normalizedBase64}`,
                contentType: input.contentType,
                imageBase64: normalizedBase64,
            };
        }
        throw new common_1.BadRequestException('Debes enviar image_url o image_base64 para la foto.');
    }
    parseStoredImage(url) {
        if (!url.startsWith('data:')) {
            return {
                image_url: url,
                image_base64: null,
                content_type: null,
            };
        }
        const match = url.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) {
            return {
                image_url: url,
                image_base64: null,
                content_type: null,
            };
        }
        return {
            image_url: null,
            image_base64: match[2],
            content_type: match[1],
        };
    }
    async saveFormularioRespuesta(input) {
        if (!input.encuestadorId) {
            throw new common_1.BadRequestException('encuestador_id es requerido para guardar la respuesta.');
        }
        const now = input.capturadoEn ?? new Date();
        const responseId = (0, crypto_1.randomUUID)();
        const formularioId = String(input.formularioId);
        const encuestadorId = String(input.encuestadorId);
        const campesinoId = input.campesinoId == null ? null : String(input.campesinoId);
        const payload = {
            formulario_id: formularioId,
            campesino_id: campesinoId,
            encuestador_id: encuestadorId,
            respuestas: input.respuestas,
            metadata: input.metadata ?? {},
            capturado_en: now.toISOString(),
        };
        const result = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO respuestas.respuesta_form (
        id_respuesta,
        id_formulario,
        respuestas,
        llenado_por,
        created_at,
        update_at,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      ) VALUES (
        CAST(${responseId} AS uuid),
        CAST(${formularioId} AS uuid),
        CAST(${JSON.stringify(payload)} AS jsonb),
        CAST(${encuestadorId} AS uuid),
        ${now},
        ${now},
        'synced',
        0,
        ${now},
        NULL
      )
      RETURNING id_respuesta;
    `);
        return result[0]?.id_respuesta || null;
    }
    async saveUsuarioPerfilImagen(input) {
        const stored = this.buildStoredImageUrl({
            imageUrl: input.imageUrl,
            imageBase64: input.imageBase64,
            contentType: input.contentType,
        });
        const now = new Date();
        const fotoId = (0, crypto_1.randomUUID)();
        const result = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO operacional.fotos_perfil (
        id_fotos,
        persona_id,
        url_nube,
        created_at,
        updated_at,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      ) VALUES (
        CAST(${fotoId} AS uuid),
        CAST(${String(input.usuarioId)} AS uuid),
        ${stored.url},
        ${now},
        ${now},
        'synced',
        0,
        ${now},
        NULL
      )
      ON CONFLICT (persona_id)
      DO UPDATE SET
        url_nube = EXCLUDED.url_nube,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status,
        sync_attempts = 0,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_error = NULL
      RETURNING id_fotos;
    `);
        return result[0]?.id_fotos || null;
    }
    async getUsuarioPerfilImagen(usuarioId) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        id_fotos,
        persona_id,
        url_nube,
        created_at,
        updated_at,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(usuarioId)}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1;
    `);
        const document = rows[0];
        if (!document) {
            return null;
        }
        const parsed = this.parseStoredImage(document.url_nube);
        return {
            _id: document.id_fotos,
            usuario_id: Number(document.persona_id),
            content_type: parsed.content_type,
            file_name: null,
            size_bytes: null,
            image_base64: parsed.image_base64,
            image_url: parsed.image_url,
            metadata: null,
            creado_en: document.created_at,
            actualizado_en: document.updated_at,
        };
    }
    async deleteUsuarioPerfilImagen(usuarioId) {
        const deleted = await this.prisma.$executeRaw(client_1.Prisma.sql `
      DELETE FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(usuarioId)};
    `);
        return deleted > 0;
    }
    async saveCampesinoPerfilImagen(input) {
        const stored = this.buildStoredImageUrl({
            imageUrl: input.imageUrl,
            imageBase64: input.imageBase64,
            contentType: input.contentType,
        });
        const now = new Date();
        const result = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO operacional.fotos_perfil (
        id_fotos,
        persona_id,
        url_nube,
        created_at,
        updated_at,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      ) VALUES (
        ${(0, crypto_1.randomUUID)()},
        ${String(input.campesinoId)},
        ${stored.url},
        ${now},
        ${now},
        'synced',
        0,
        ${now},
        NULL
      )
      ON CONFLICT (persona_id)
      DO UPDATE SET
        url_nube = EXCLUDED.url_nube,
        updated_at = EXCLUDED.updated_at,
        sync_status = EXCLUDED.sync_status,
        sync_attempts = 0,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_error = NULL
      RETURNING id_fotos;
    `);
        return result[0]?.id_fotos || null;
    }
    async getCampesinoPerfilImagen(campesinoId) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        id_fotos,
        persona_id,
        url_nube,
        created_at,
        updated_at,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(campesinoId)}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1;
    `);
        const document = rows[0];
        if (!document) {
            return null;
        }
        const parsed = this.parseStoredImage(document.url_nube);
        return {
            _id: document.id_fotos,
            campesino_id: Number(document.persona_id),
            content_type: parsed.content_type,
            file_name: null,
            size_bytes: null,
            image_base64: parsed.image_base64,
            image_url: parsed.image_url,
            metadata: null,
            creado_en: document.created_at,
            actualizado_en: document.updated_at,
        };
    }
    async deleteCampesinoPerfilImagen(campesinoId) {
        const deleted = await this.prisma.$executeRaw(client_1.Prisma.sql `
      DELETE FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(campesinoId)};
    `);
        return deleted > 0;
    }
};
exports.PostgresStorageService = PostgresStorageService;
exports.PostgresStorageService = PostgresStorageService = PostgresStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PostgresStorageService);
//# sourceMappingURL=postgres-storage.service.js.map