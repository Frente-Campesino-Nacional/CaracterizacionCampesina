import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  private isMissingRelationError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
  }

  async findAll() {
    const syncRows = await this.loadSyncRows();
    const auditRows = await this.loadAuditRows();

    return [...syncRows, ...auditRows]
      .sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime())
      .slice(0, 100);
  }

  private async loadSyncRows() {
    try {
      return await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
        SELECT
          id,
          entidad,
          entidad_id,
          operacion,
          datos,
          estado,
          intentos,
          error,
          creado_en,
          procesado_en
        FROM operacional.sincronizaciones
        ORDER BY creado_en DESC
      `);
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }

  private async loadAuditRows() {
    try {
      const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
        SELECT
          id_historial::text AS id,
          CASE
            WHEN LOWER(tabla_nombre) LIKE '%campesino%' THEN 'campesino'
            WHEN LOWER(tabla_nombre) LIKE '%usuario%' THEN 'usuario'
            WHEN LOWER(tabla_nombre) LIKE '%consejo%' THEN 'consejo'
            WHEN LOWER(tabla_nombre) LIKE '%formulario%' THEN 'formulario'
            ELSE LOWER(tabla_nombre)
          END AS entidad,
          registro_id::text AS entidad_id,
          CASE
            WHEN LOWER(accion) = 'insert' THEN 'create'
            WHEN LOWER(accion) = 'update' THEN 'update'
            WHEN LOWER(accion) = 'delete' THEN 'delete'
            ELSE LOWER(accion)
          END AS operacion,
          COALESCE(valores_nuevos, valores_anteriores, '{}'::jsonb) AS datos,
          TRIM(COALESCE(
            CONCAT(p.nombre, ' ', p.apellido),
            u.nombre_usuario,
            p.email,
            h.usuario_id_reg::text
          )) AS actor_nombre,
          COALESCE(
            COALESCE(
              COALESCE(valores_nuevos->> 'nombre', valores_anteriores->> 'nombre'),
              COALESCE(valores_nuevos->> 'nombre_completo', valores_anteriores->> 'nombre_completo'),
              COALESCE(valores_nuevos->> 'nombre_persona', valores_anteriores->> 'nombre_persona'),
              COALESCE(valores_nuevos->> 'titulo', valores_anteriores->> 'titulo'),
              COALESCE(valores_nuevos->> 'nombre_consejo', valores_anteriores->> 'nombre_consejo'),
              COALESCE(valores_nuevos->> 'nombre_usuario', valores_anteriores->> 'nombre_usuario'),
              COALESCE(valores_nuevos->> 'email', valores_anteriores->> 'email')
            ),
            NULL
          ) AS target_nombre,
          'PROCESADO' AS estado,
          0 AS intentos,
          NULL AS error,
          h.created_at AS creado_en,
          h.created_at AS procesado_en
        FROM auditoria.historial_cambios h
        LEFT JOIN seguridad.usuarios u ON u.id_usuario = h.usuario_id_reg
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        ORDER BY h.created_at DESC
      `);

      return rows.map((row) => {
        const entidad = String(row.entidad || 'registro');
        const operacion = String(row.operacion || '').toLowerCase();
        const actorNombre = String(row.actor_nombre || '').trim();
        const targetNombre = String(row.target_nombre || '').trim();
        const entityLabel = entidad === 'campesino'
          ? 'Campesino'
          : entidad === 'usuario'
            ? 'Usuario'
            : entidad === 'formulario'
              ? 'Formulario'
              : entidad === 'consejo'
                ? 'Consejo'
                : entidad.charAt(0).toUpperCase() + entidad.slice(1);
        const actionLabel = operacion.includes('create') || operacion.includes('insert') || operacion.includes('registro') || operacion.includes('registr')
          ? 'registrado'
          : operacion.includes('update') || operacion.includes('edit') || operacion.includes('modif')
            ? 'actualizado'
            : operacion.includes('delete') || operacion.includes('remove')
              ? 'eliminado'
              : operacion.includes('sync') || operacion.includes('proces')
                ? 'sincronizado'
                : 'actualizado';

        const mensaje = [
          `${entityLabel}${targetNombre ? ` ${targetNombre}` : ''} fue ${actionLabel}`,
          actorNombre ? ` por ${actorNombre}` : '',
        ].join('').trim();

        return {
          ...row,
          datos: row.datos ?? {},
          mensaje,
        };
      });
    } catch (error) {
      if (this.isMissingRelationError(error)) {
        return [];
      }
      throw error;
    }
  }

  async create(createSyncDto: CreateSyncDto) {
    const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      INSERT INTO operacional.sincronizaciones (
        entidad,
        entidad_id,
        operacion,
        datos,
        estado,
        intentos,
        error,
        procesado_en
      )
      VALUES (
        ${createSyncDto.entidad},
        ${createSyncDto.entidad_id},
        ${createSyncDto.operacion},
        ${JSON.stringify(createSyncDto.datos)}::jsonb,
        ${createSyncDto.estado ?? 'PENDIENTE'},
        ${createSyncDto.intentos ?? 0},
        ${createSyncDto.error ?? null},
        ${createSyncDto.procesado_en ? new Date(createSyncDto.procesado_en) : null}
      )
      RETURNING id, entidad, entidad_id, operacion, datos, estado, intentos, error, creado_en, procesado_en
    `);

    return rows[0];
  }

  async update(id: string, updateSyncDto: UpdateSyncDto) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM operacional.sincronizaciones WHERE id::text = ${String(id)}
    `);

    if (!existing.length) {
      throw new NotFoundException('Registro de sincronización no encontrado');
    }

    const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      UPDATE operacional.sincronizaciones
      SET
        entidad = COALESCE(${updateSyncDto.entidad ?? null}, entidad),
        entidad_id = COALESCE(${updateSyncDto.entidad_id ?? null}, entidad_id),
        operacion = COALESCE(${updateSyncDto.operacion ?? null}, operacion),
        datos = COALESCE(${updateSyncDto.datos ? JSON.stringify(updateSyncDto.datos) : null}::jsonb, datos),
        estado = COALESCE(${updateSyncDto.estado ?? null}, estado),
        intentos = COALESCE(${updateSyncDto.intentos ?? null}, intentos),
        error = COALESCE(${updateSyncDto.error ?? null}, error),
        procesado_en = COALESCE(${updateSyncDto.procesado_en ? new Date(updateSyncDto.procesado_en) : null}, procesado_en)
      WHERE id::text = ${String(id)}
      RETURNING id, entidad, entidad_id, operacion, datos, estado, intentos, error, creado_en, procesado_en
    `);

    return rows[0];
  }

  async process(id: string) {
    const existing = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM operacional.sincronizaciones WHERE id::text = ${String(id)}
    `);

    if (!existing.length) {
      throw new NotFoundException('Registro de sincronización no encontrado');
    }

    const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      UPDATE operacional.sincronizaciones
      SET estado = 'PROCESADO', procesado_en = NOW()
      WHERE id::text = ${String(id)}
      RETURNING id, entidad, entidad_id, operacion, datos, estado, intentos, error, creado_en, procesado_en
    `);

    return rows[0];
  }
}