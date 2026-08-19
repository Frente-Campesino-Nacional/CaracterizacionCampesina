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
    const auditRows = await this.loadAuditRows();
    if (auditRows.length > 0) {
      return auditRows.slice(0, 100);
    }

    const syncRows = await this.loadSyncRows();
    return syncRows.slice(0, 100);
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

  private formatFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      nombre: 'Nombre',
      apellido: 'Apellido',
      email: 'Correo electrónico',
      correo: 'Correo electrónico',
      cedula: 'Cédula',
      tipo_cedula: 'Tipo de Cédula',
      fecha_nacimiento: 'Fecha de nacimiento',
      numero_telefonico: 'Teléfono',
      numero_telefono: 'Teléfono',
      telefono: 'Teléfono',
      id_rol: 'Rol',
      rol: 'Rol',
      direccion_usuario: 'Dirección',
      direccion: 'Dirección',
      genero: 'Género',
      parroquia: 'Parroquia',
      municipio: 'Municipio',
      estado: 'Estado',
      consejo_nombre: 'Consejo Comunal',
      sync_status: 'Estado de cuenta',
      activo: 'Estado de cuenta',
      formularios_pendientes: 'Formularios pendientes',
      password_hash: 'Contraseña',
      password: 'Contraseña',
      url_nube: 'Foto de perfil',
    };
    return labels[key] || key;
  }

  private formatFieldValue(key: string, val: any): string {
    if (val == null || val === '') return '';
    if (typeof val === 'boolean') return val ? 'Activo' : 'Inactivo';
    if (key === 'sync_status') {
      if (val === 'disabled') return 'Inactivo';
      if (val === 'synced') return 'Activo';
      return String(val);
    }
    if (key === 'id_rol' || key === 'rol') {
      if (Number(val) === 1 || String(val).toLowerCase() === 'administrador') return 'Administrador';
      if (Number(val) === 2 || String(val).toLowerCase() === 'encuestador') return 'Encuestador';
      return String(val);
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('$2')) return '[Contraseña protegida]';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
        return '[Asignación]';
      }
      // Formatear fechas ISO (ej. 2000-10-06T00:00:00.000Z -> 06/10/2000)
      if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }
      }
    }
    return String(val);
  }

  private computeChanges(anteriores: any, nuevos: any): string[] {
    if (!anteriores || !nuevos) return [];
    const ignoredKeys = new Set([
      'created_at',
      'update_at',
      'updated_at',
      'sync_attempts',
      'sync_error',
      'last_synced_at',
      'id_personas',
      'id_usuario',
      'id_campesinos',
      'id_historial',
      'registro_id',
      'creado_por',
      'asignado_a',
      'consejo_id',
      'parroquia_id',
      'municipio_id',
      'estado_id',
      'genero_id',
    ]);

    const changes: string[] = [];
    const oldObj = anteriores && typeof anteriores === 'object' && !Array.isArray(anteriores) ? anteriores : {};
    const newObj = nuevos && typeof nuevos === 'object' && !Array.isArray(nuevos) ? nuevos : {};
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      if (ignoredKeys.has(key)) continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      const oldStr = oldVal != null ? String(oldVal).trim() : '';
      const newStr = newVal != null ? String(newVal).trim() : '';

      if (oldStr !== newStr) {
        if (key === 'password_hash' || key === 'password') {
          changes.push('Contraseña actualizada');
          continue;
        }
        const label = this.formatFieldLabel(key);
        const formattedOld = this.formatFieldValue(key, oldVal);
        const formattedNew = this.formatFieldValue(key, newVal);

        if (formattedOld === '[Asignación]' || formattedNew === '[Asignación]') {
          changes.push(`Se actualizó ${label}`);
        } else if (!formattedOld && formattedNew) {
          changes.push(`${label}: "${formattedNew}"`);
        } else if (formattedOld && !formattedNew) {
          changes.push(`${label}: borrado`);
        } else if (formattedOld && formattedNew) {
          changes.push(`${label}: "${formattedOld}" ➔ "${formattedNew}"`);
        }
      }
    }

    return changes;
  }

  private async loadAuditRows() {
    try {
      const rawRows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
        SELECT
          h.id_historial::text AS id,
          h.tabla_nombre,
          h.registro_id::text AS entidad_id,
          h.accion,
          h.valores_anteriores,
          h.valores_nuevos,
          h.usuario_id_reg::text AS usuario_id_reg,
          TRIM(COALESCE(
            CONCAT(p.nombre, ' ', p.apellido),
            p.email,
            'Sistema'
          )) AS actor_nombre,
          h.created_at AS creado_en
        FROM auditoria.historial_cambios h
        LEFT JOIN seguridad.usuarios u ON u.id_usuario = h.usuario_id_reg
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        ORDER BY h.created_at DESC
        LIMIT 200
      `);

      if (!rawRows.length) return [];

      // Group rows by target record & timestamp (3-second window) to collapse dual table triggers into 1 item
      const groups = new Map<string, any[]>();

      for (const row of rawRows) {
        const timestampBucket = Math.floor(new Date(row.creado_en).getTime() / 3000);
        const groupKey = `${row.entidad_id}_${row.accion}_${timestampBucket}`;

        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
      }

      const result: any[] = [];

      for (const rows of groups.values()) {
        const mainRow = rows[0];
        let entidad = 'registro';

        for (const r of rows) {
          if (r.tabla_nombre.includes('campesino')) entidad = 'campesino';
          else if (r.tabla_nombre.includes('usuario') || r.tabla_nombre.includes('personas')) entidad = 'usuario';
          else if (r.tabla_nombre.includes('consejo')) entidad = 'consejo';
          else if (r.tabla_nombre.includes('formulario')) entidad = 'formulario';
        }

        const entidadMap: Record<string, string> = {
          campesino: 'campesino',
          usuario: 'usuario',
          consejo: 'Consejo Comunal',
          formulario: 'formulario',
          registro: 'registro',
        };
        const entidadDisplay = entidadMap[entidad] || entidad;
        const operacion = mainRow.accion.toLowerCase();

        let targetName = '';
        for (const r of rows) {
          const datos = r.valores_nuevos || r.valores_anteriores || {};
          if (datos.nombre || datos.nombre_consejo || datos.titulo) {
            targetName = (datos.nombre ? `${datos.nombre} ${datos.apellido || ''}` : (datos.nombre_consejo || datos.titulo || '')).trim();
            break;
          }
          if (datos.email) {
            targetName = datos.email;
            break;
          }
        }

        let allChanges: string[] = [];
        if (operacion === 'update') {
          for (const r of rows) {
            const changes = this.computeChanges(r.valores_anteriores, r.valores_nuevos);
            allChanges.push(...changes);
          }
          allChanges = Array.from(new Set(allChanges));
        }

        let mensaje = '';
        const actorName = mainRow.actor_nombre ? mainRow.actor_nombre : 'Sistema';

        if (operacion === 'insert' || operacion === 'create') {
          mensaje = `${entidadDisplay.charAt(0).toUpperCase() + entidadDisplay.slice(1)}${targetName ? ` "${targetName}"` : ''} fue creado por ${actorName}`;
        } else if (operacion === 'delete' || operacion === 'remove') {
          mensaje = `${entidadDisplay.charAt(0).toUpperCase() + entidadDisplay.slice(1)}${targetName ? ` "${targetName}"` : ''} fue eliminado por ${actorName}`;
        } else {
          if (allChanges.length > 0) {
            mensaje = `Se cambió ${allChanges.join(', ')} al ${entidadDisplay}${targetName ? ` "${targetName}"` : ''} por ${actorName}`;
          } else {
            mensaje = `Se actualizó el ${entidadDisplay}${targetName ? ` "${targetName}"` : ''} por ${actorName}`;
          }
        }

        result.push({
          id: mainRow.id,
          entidad,
          entidad_id: mainRow.entidad_id,
          operacion: operacion === 'insert' ? 'create' : operacion,
          datos: mainRow.valores_nuevos || mainRow.valores_anteriores || {},
          actor_nombre: mainRow.actor_nombre,
          target_nombre: targetName,
          mensaje,
          line: mensaje,
          estado: 'PROCESADO',
          intentos: 0,
          error: null,
          creado_en: mainRow.creado_en,
          procesado_en: mainRow.creado_en,
        });
      }

      return result.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
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