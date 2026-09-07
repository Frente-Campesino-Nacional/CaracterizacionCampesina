import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';

@Injectable()
export class ConsejosService {
  constructor(private prisma: PrismaService) {}

  private async resolveUsuarioUuid(value: string | number | undefined) {
    if (value == null || value === '') {
      return null;
    }

    const textValue = String(value).trim();
    if (!textValue) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<{ id_usuario: string }>>(Prisma.sql`
      SELECT id_usuario FROM seguridad.usuarios WHERE id_usuario::text = ${textValue} LIMIT 1
    `);

    return rows[0]?.id_usuario ?? null;
  }

  private async mapConsejo(consejo: any) {
    return {
      id: consejo.consejo_id,
      nombre: consejo.nombre_consejo,
      descripcion: consejo.descripcion,
      estado_id: consejo.estado_id ?? null,
      estado: consejo.estado || null,
      municipio_id: consejo.municipio_id ?? null,
      municipio: consejo.municipio || null,
      parroquia_id: consejo.parroquia_id ?? null,
      parroquia: consejo.parroquia || null,
      encargado_tipo: consejo.encargado_rol || 'usuario',
      encargado_id: consejo.encargado_id ?? null,
      encargado_nombre: consejo.encargado_nombre ?? null,
      creado_en: consejo.creado_en ?? consejo.created_at,
      actualizado_en: consejo.actualizado_en ?? consejo.updated_at,
    };
  }

  async findAll() {
    const consejos = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT
        c.consejo_id,
        c.nombre_consejo,
        c.descripcion,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        c.encargado_id,
        CONCAT(p.nombre, ' ', p.apellido) AS encargado_nombre,

        r.tip_rol AS encargado_rol,
        c.creado_en,
        c.actualizado_en
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

  async findOne(id: string | number) {
    const textId = String(id).trim();
    const consejo = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT
        c.consejo_id,
        c.nombre_consejo,
        c.descripcion,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        c.encargado_id,
        CONCAT(p.nombre, ' ', p.apellido) AS encargado_nombre,

        r.tip_rol AS encargado_rol,
        c.creado_en,
        c.actualizado_en
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
      throw new NotFoundException('Consejo no encontrado');
    }

    return this.mapConsejo(consejo[0]);
  }

  async create(createConsejoDto: CreateConsejoDto) {
    const existing = await this.prisma.$queryRaw<Array<{ consejo_id: string }>>(Prisma.sql`
      SELECT consejo_id FROM operacional.consejos WHERE LOWER(nombre_consejo) = LOWER(${createConsejoDto.nombre}) LIMIT 1
    `);

    if (existing[0]) {
      throw new ConflictException('Ya existe un consejo con ese nombre');
    }

    const encargadoUuid = await this.resolveUsuarioUuid(createConsejoDto.encargado_id as any);
    const created = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      INSERT INTO operacional.consejos (nombre_consejo, descripcion, parrroquia, direccion_csj, encargado_id)
      VALUES (
        ${createConsejoDto.nombre},
        ${createConsejoDto.descripcion ?? null},
        ${createConsejoDto.parroquia_id ?? 1},
        ${null},
        CAST(${encargadoUuid ?? null} AS uuid)
      )
      RETURNING consejo_id, nombre_consejo, descripcion, parrroquia, encargado_id, creado_en, actualizado_en
    `);

    return this.mapConsejo(created[0]);
  }

  async update(id: string | number, updateConsejoDto: UpdateConsejoDto) {
    const textId = String(id).trim();
    const current = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT consejo_id FROM operacional.consejos WHERE consejo_id::text = ${textId} LIMIT 1
    `);

    if (!current[0]) {
      throw new NotFoundException('Consejo no encontrado');
    }

    const encargadoUuid = updateConsejoDto.encargado_id != null ? await this.resolveUsuarioUuid(updateConsejoDto.encargado_id as any) : null;
    const updated = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      UPDATE operacional.consejos
      SET
        nombre_consejo = COALESCE(${updateConsejoDto.nombre ?? null}, nombre_consejo),
        descripcion = COALESCE(${updateConsejoDto.descripcion ?? null}, descripcion),
        parrroquia = COALESCE(${updateConsejoDto.parroquia_id ?? null}, parrroquia),
        direccion_csj = COALESCE(${null}, direccion_csj),
        encargado_id = COALESCE(CAST(${encargadoUuid ?? null} AS uuid), encargado_id),
        actualizado_en = NOW()
      WHERE consejo_id::text = ${String(current[0].consejo_id)}
      RETURNING consejo_id, nombre_consejo, descripcion, parrroquia, encargado_id, creado_en, actualizado_en
    `);

    return this.mapConsejo(updated[0]);
  }

  async remove(id: string | number) {
    const textId = String(id).trim();
    const current = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT consejo_id FROM operacional.consejos WHERE consejo_id::text = ${textId} LIMIT 1
    `);

    if (!current[0]) {
      throw new NotFoundException('Consejo no encontrado');
    }

    await this.prisma.$queryRaw(Prisma.sql`
      DELETE FROM operacional.consejos WHERE consejo_id::text = ${String(current[0].consejo_id)}
    `);

    return { deleted: true };
  }
}