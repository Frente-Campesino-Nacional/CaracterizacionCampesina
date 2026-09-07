import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';

type JsonMap = Record<string, unknown>;

interface FormularioRespuestaStorageInput {
  formularioId: string | number;
  campesinoId?: string | number | null;
  encuestadorId?: string | number | null;
  respuestas: JsonMap;
  metadata?: JsonMap;
  capturadoEn?: Date;
}

interface UsuarioPerfilImagenStorageInput {
  usuarioId: string | number;
  contentType: string;
  fileName?: string;
  sizeBytes?: number;
  imageBase64?: string;
  imageUrl?: string;
  metadata?: JsonMap;
}

interface CampesinoPerfilImagenStorageInput {
  campesinoId: string | number;
  contentType: string;
  fileName?: string;
  sizeBytes?: number;
  imageBase64?: string;
  imageUrl?: string;
  metadata?: JsonMap;
}

@Injectable()
export class PostgresStorageService implements OnModuleInit {
  private readonly logger = new Logger(PostgresStorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Almacenamiento PostgreSQL disponible para respuestas y fotos.');
  }

  isEnabled(): boolean {
    return true;
  }

  private buildStoredImageUrl(input: {
    imageUrl?: string;
    imageBase64?: string;
    contentType: string;
  }): { url: string; contentType: string; imageBase64?: string } {
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

    throw new BadRequestException('Debes enviar image_url o image_base64 para la foto.');
  }

  private parseStoredImage(url: string) {
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

  async saveFormularioRespuesta(input: FormularioRespuestaStorageInput): Promise<string | null> {
    if (!input.encuestadorId) {
      throw new BadRequestException('encuestador_id es requerido para guardar la respuesta.');
    }

    const now = input.capturadoEn ?? new Date();
    const responseId = randomUUID();
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

    const result = await this.prisma.$queryRaw<Array<{ id_respuesta: string }>>(Prisma.sql`
      INSERT INTO respuestas.respuesta_form (
        id_respuesta,
        id_formulario,
        respuestas,
        llenado_por,
        creado_en,
        actualizado_en,
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

  async saveUsuarioPerfilImagen(input: UsuarioPerfilImagenStorageInput): Promise<string | null> {
    const stored = this.buildStoredImageUrl({
      imageUrl: input.imageUrl,
      imageBase64: input.imageBase64,
      contentType: input.contentType,
    });

    const now = new Date();
    const fotoId = randomUUID();
    const result = await this.prisma.$queryRaw<Array<{ id_fotos: string }>>(Prisma.sql`
      INSERT INTO operacional.fotos_perfil (
        id_fotos,
        persona_id,
        url_nube,
        creado_en,
        actualizado_en,
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
        actualizado_en = EXCLUDED.actualizado_en,
        sync_status = EXCLUDED.sync_status,
        sync_attempts = 0,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_error = NULL
      RETURNING id_fotos;
    `);

    return result[0]?.id_fotos || null;
  }

  async getUsuarioPerfilImagen(usuarioId: string | number): Promise<Record<string, unknown> | null> {
    const rows = await this.prisma.$queryRaw<Array<{
      id_fotos: string;
      persona_id: string;
      url_nube: string;
      creado_en: Date;
      actualizado_en: Date;
      sync_status: string;
      sync_attempts: number;
      last_synced_at: Date | null;
      sync_error: string | null;
    }>>(Prisma.sql`
      SELECT
        id_fotos,
        persona_id,
        url_nube,
        creado_en,
        actualizado_en,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(usuarioId)}
      ORDER BY actualizado_en DESC, creado_en DESC
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
      creado_en: document.creado_en,
      actualizado_en: document.actualizado_en,
    };
  }

  async deleteUsuarioPerfilImagen(usuarioId: string | number): Promise<boolean> {
    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(usuarioId)};
    `);

    return deleted > 0;
  }

  async saveCampesinoPerfilImagen(input: CampesinoPerfilImagenStorageInput): Promise<string | null> {
    const stored = this.buildStoredImageUrl({
      imageUrl: input.imageUrl,
      imageBase64: input.imageBase64,
      contentType: input.contentType,
    });

    const now = new Date();
    const result = await this.prisma.$queryRaw<Array<{ id_fotos: string }>>(Prisma.sql`
      INSERT INTO operacional.fotos_perfil (
        id_fotos,
        persona_id,
        url_nube,
        creado_en,
        actualizado_en,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      ) VALUES (
        ${randomUUID()},
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
        actualizado_en = EXCLUDED.actualizado_en,
        sync_status = EXCLUDED.sync_status,
        sync_attempts = 0,
        last_synced_at = EXCLUDED.last_synced_at,
        sync_error = NULL
      RETURNING id_fotos;
    `);

    return result[0]?.id_fotos || null;
  }

  async getCampesinoPerfilImagen(campesinoId: string | number): Promise<Record<string, unknown> | null> {
    const rows = await this.prisma.$queryRaw<Array<{
      id_fotos: string;
      persona_id: string;
      url_nube: string;
      creado_en: Date;
      actualizado_en: Date;
      sync_status: string;
      sync_attempts: number;
      last_synced_at: Date | null;
      sync_error: string | null;
    }>>(Prisma.sql`
      SELECT
        id_fotos,
        persona_id,
        url_nube,
        creado_en,
        actualizado_en,
        sync_status,
        sync_attempts,
        last_synced_at,
        sync_error
      FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(campesinoId)}
      ORDER BY actualizado_en DESC, creado_en DESC
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
      creado_en: document.creado_en,
      actualizado_en: document.actualizado_en,
    };
  }

  async deleteCampesinoPerfilImagen(campesinoId: string | number): Promise<boolean> {
    const deleted = await this.prisma.$executeRaw(Prisma.sql`
      DELETE FROM operacional.fotos_perfil
      WHERE persona_id::text = ${String(campesinoId)};
    `);

    return deleted > 0;
  }
}
