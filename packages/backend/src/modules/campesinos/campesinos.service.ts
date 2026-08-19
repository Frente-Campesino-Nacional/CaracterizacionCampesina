import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostgresStorageService } from '../../database/postgres-storage.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampesinDto } from './dto/create-campesino.dto';
import { UpdateCampesinDto } from './dto/update-campesino.dto';
import { SaveCampesinoProfileImageDto } from './dto/save-profile-image.dto';
import { normalizeCedulaInput } from '../../common/utils/cedula-code.util';

@Injectable()
export class CampesinosService {
  constructor(
    private prisma: PrismaService,
    private storageService: PostgresStorageService,
  ) {}

  private async recordAuditLog(params: {
    usuarioId?: string | null;
    tablaNombre: string;
    registroId: string;
    accion: 'INSERT' | 'UPDATE' | 'DELETE';
    valoresAnteriores?: any;
    valoresNuevos?: any;
  }) {
    try {
      const userUuid = params.usuarioId ? Prisma.sql`CAST(${params.usuarioId} AS uuid)` : Prisma.sql`NULL`;
      const regUuid = Prisma.sql`CAST(${params.registroId} AS uuid)`;
      const oldJson = params.valoresAnteriores ? JSON.stringify(params.valoresAnteriores) : null;
      const newJson = params.valoresNuevos ? JSON.stringify(params.valoresNuevos) : null;

      await this.prisma.$queryRaw(Prisma.sql`
        INSERT INTO auditoria.historial_cambios (
          id_historial,
          usuario_id_reg,
          tabla_nombre,
          registro_id,
          accion,
          valores_anteriores,
          valores_nuevos,
          origen,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${userUuid},
          ${params.tablaNombre},
          ${regUuid},
          ${params.accion},
          ${oldJson ? Prisma.sql`CAST(${oldJson} AS jsonb)` : Prisma.sql`NULL`},
          ${newJson ? Prisma.sql`CAST(${newJson} AS jsonb)` : Prisma.sql`NULL`},
          'MOBILE_APP',
          NOW()
        )
      `);
    } catch {
      // Ignorar errores no criticos de auditoria
    }
  }

  private async resolveConsejoUuid(value?: string | number | null): Promise<string | null> {
    if (value == null || value === '') {
      return null;
    }

    const textValue = String(value).trim();
    if (!textValue) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<{ consejo_id: string }>>(Prisma.sql`
      SELECT consejo_id
      FROM operacional.consejos
      WHERE consejo_id::text = ${textValue}
      LIMIT 1
    `);

    return rows[0]?.consejo_id ?? null;
  }

  private async resolveUserUuid(value?: string | number | null): Promise<string | null> {
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

  private normalizeDateInput(value?: string) {
    if (!value) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private async resolveParroquiaId(input: {
    parroquiaId?: number;
    municipioId?: number;
    estadoId?: number;
  }): Promise<number> {
    if (input.parroquiaId != null) {
      return input.parroquiaId;
    }

    if (input.municipioId != null) {
      const rows = await this.prisma.$queryRaw<Array<{ id_parroquia: number }>>(Prisma.sql`
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
      const rows = await this.prisma.$queryRaw<Array<{ id_parroquia: number }>>(Prisma.sql`
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

    const fallback = await this.prisma.$queryRaw<Array<{ id_parroquia: number }>>(Prisma.sql`
      SELECT id_parroquia
      FROM catalogos.parroquias
      ORDER BY id_parroquia
      LIMIT 1
    `);

    return fallback[0]?.id_parroquia ?? 1;
  }

  private async resolveGeneroId(genero?: string | number | null): Promise<number> {
    if (genero == null || genero === '') return 2;
    if (typeof genero === 'number') return genero;
    const textVal = String(genero).trim().toLowerCase();
    if (textVal === 'femenino' || textVal === 'f' || textVal === '1') return 1;
    if (textVal === 'masculino' || textVal === 'm' || textVal === '2') return 2;

    const rows = await this.prisma.$queryRaw<Array<{ id_genero: number }>>(Prisma.sql`
      SELECT id_genero
      FROM catalogos.generos
      WHERE LOWER(genero) = LOWER(${textVal})
      ORDER BY id_genero
      LIMIT 1
    `);
    if (rows[0]?.id_genero != null) {
      return rows[0].id_genero;
    }

    return 2;
  }

  private isValidCampesinoCedula(value: string): boolean {
    return /^([VE]-\d{6,9}|[A-Z]\d{3})$/.test(value);
  }

  private randomNoCedulaCode(): string {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const digits = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${letter}${digits}`;
  }

  private async generateUniqueCedula(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = this.randomNoCedulaCode();
      const existing = await this.prisma.$queryRaw<Array<{ cedula: string }>>(Prisma.sql`
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

  private buildCedulaData(value?: string) {
    if (!value) {
      return { tipoCedula: 'NP' as 'V' | 'E' | 'NP', cedula: '' };
    }

    const normalized = normalizeCedulaInput(value);

    const prefixedMatch = normalized.match(/^([VE])-(\d{6,9})$/);
    if (prefixedMatch) {
      return {
        tipoCedula: prefixedMatch[1] as 'V' | 'E',
        cedula: prefixedMatch[2],
      };
    }

    if (/^[A-Z]\d{3}$/.test(normalized)) {
      return { tipoCedula: 'NP' as 'V' | 'E' | 'NP', cedula: normalized };
    }

    if (/^\d{6,9}$/.test(normalized)) {
      return { tipoCedula: 'V' as 'V' | 'E' | 'NP', cedula: normalized };
    }

    return { tipoCedula: 'NP' as 'V' | 'E' | 'NP', cedula: '' };
  }

  private formatCedulaForResponse(tipoCedula?: string | null, cedula?: string | null): string {
    if (!cedula) {
      return '';
    }

    if (tipoCedula === 'V' || tipoCedula === 'E') {
      return `${tipoCedula}-${cedula}`;
    }

    return cedula;
  }

  private async findCampesinoRow(identifier: string | number) {
    const textValue = String(identifier).trim();
    const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
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
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        csj.nombre_consejo AS consejo_nombre,
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
        fp.url_nube AS foto_url,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM operacional.campesinos c
      LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.consejos csj ON csj.consejo_id::text = p.consejo_id::text
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = c.id_campesinos
      WHERE c.id_campesinos::text = ${textValue}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  private mapCampesino(campesino: any) {
    if (!campesino || typeof campesino !== 'object') {
      return null;
    }

    return {
      id: campesino.id,
      cedula: this.formatCedulaForResponse(campesino.tipo_cedula, campesino.cedula),
      nombre: campesino.nombre,
      apellido: campesino.apellido,
      telefono: campesino.telefono,
      correo: campesino.correo,
      fecha_nacimiento: campesino.fecha_nacimiento
        ? (campesino.fecha_nacimiento instanceof Date
            ? campesino.fecha_nacimiento.toISOString().slice(0, 10)
            : String(campesino.fecha_nacimiento).slice(0, 10))
        : null,

      genero: campesino.genero || null,
      estado_id: campesino.estado_id ?? null,
      estado: campesino.estado || null,
      municipio_id: campesino.municipio_id ?? null,
      municipio: campesino.municipio || null,
      parroquia_id: campesino.parroquia_id ?? null,
      parroquia: campesino.parroquia || null,
      direccion: campesino.direccion,
      consejo_id: campesino.consejo_id ?? null,
      consejo_nombre: campesino.consejo_nombre || null,
      creado_por: campesino.creado_por ?? null,
      asignado_a: campesino.asignado_a ?? null,
      tiene_pendientes: Boolean(campesino.tiene_pendientes),
      metadata: campesino.metadata && typeof campesino.metadata === 'object' && !Array.isArray(campesino.metadata) ? campesino.metadata : { formularios_respondidos: [] },
      foto_url: campesino.foto_url || null,
      creado_en: campesino.creado_en,
      actualizado_en: campesino.actualizado_en ?? campesino.creado_en,
    };
  }

  async findAll(requester: { id: string; rol: string }, consejoId?: string | number) {
    let whereClause = Prisma.empty;
    const isEncuestador = (requester?.rol || '').toLowerCase() === 'encuestador';

    if (isEncuestador) {
      const encuestadorUuid = String(requester.id);
      whereClause = Prisma.sql`WHERE (c.asignado_a::text = ${encuestadorUuid} OR c.creado_por::text = ${encuestadorUuid})`;
    } else {
      const targetConsejoId = await this.resolveConsejoUuid(consejoId);
      whereClause = targetConsejoId
        ? Prisma.sql`WHERE p.consejo_id::text = ${targetConsejoId}`
        : Prisma.empty;
    }

    const campesinos = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
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
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        csj.nombre_consejo AS consejo_nombre,
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
        fp.url_nube AS foto_url,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM operacional.campesinos c
      LEFT JOIN registros.personas p ON p.id_personas = c.id_campesinos
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.consejos csj ON csj.consejo_id::text = p.consejo_id::text
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = c.id_campesinos
      ${whereClause}
      ORDER BY p.nombre
    `);

    const safeList = Array.isArray(campesinos) ? campesinos : [];
    return safeList
      .map((campesino) => this.mapCampesino(campesino))
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.id));
  }

  async findOne(id: string | number, requester: { id: string; rol: string }) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    if ((requester?.rol || '').toLowerCase() === 'encuestador') {
      const encuestadorUuid = String(requester.id);
      const isAssignedOrCreator = (
        !campesino.asignado_a ||
        String(campesino.asignado_a) === encuestadorUuid ||
        String(campesino.creado_por) === encuestadorUuid
      );

      if (!isAssignedOrCreator) {
        throw new ForbiddenException('No tiene permiso para acceder a este campesino');
      }
    }

    return this.mapCampesino(campesino);
  }

  private validatePhoneInput(phone?: string | null): string | null {
    if (!phone || !phone.trim()) return null;
    const trimmed = phone.trim();
    const digitsOnly = trimmed.replace(/[\s\-()+]/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      throw new BadRequestException('El número telefónico debe contener entre 7 y 15 dígitos (ejemplo: 04141234567)');
    }
    return trimmed;
  }

  async create(createCampesinDto: CreateCampesinDto, requesterId?: string) {
    if (createCampesinDto.telefono) {
      this.validatePhoneInput(createCampesinDto.telefono);
    }

    const trimmedNombre = createCampesinDto.nombre?.trim();
    if (!trimmedNombre) {
      throw new BadRequestException('El nombre del campesino es obligatorio');
    }

    if (createCampesinDto.correo && createCampesinDto.correo.trim()) {
      const emailVal = createCampesinDto.correo.trim().toLowerCase();
      createCampesinDto.correo = emailVal;
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailVal)) {
        throw new BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
      }

      const existing = await this.prisma.$queryRaw<Array<{ id_personas: string }>>(Prisma.sql`
        SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailVal}) LIMIT 1
      `);
      if (existing[0]) {
        throw new ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
      }
    }




    let tipoCedula: 'V' | 'E' | 'NP';
    let cedula: string;
    if (createCampesinDto.cedula) {
      const normalizedCedula = normalizeCedulaInput(createCampesinDto.cedula);
      if (!this.isValidCampesinoCedula(normalizedCedula)) {
        throw new BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
      }

      const parsedCedula = this.buildCedulaData(normalizedCedula);
      tipoCedula = parsedCedula.tipoCedula;
      cedula = parsedCedula.cedula;
    } else {
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
    const asignadoA = await this.resolveUserUuid(createCampesinDto.asignado_a ?? requesterId ?? null);
    const fechaNacimiento = this.normalizeDateInput(createCampesinDto.fecha_nacimiento) ?? new Date('1990-01-01T00:00:00.000Z');
    const personId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
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

      await tx.$queryRaw(Prisma.sql`
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
      throw new NotFoundException('No se pudo crear el campesino');
    }

    void this.recordAuditLog({
      usuarioId: requesterId,
      tablaNombre: 'campesinos',
      registroId: personId,
      accion: 'INSERT',
      valoresNuevos: { nombre: trimmedNombre, apellido: createCampesinDto.apellido },
    });

    return this.mapCampesino(created);
  }

  async update(id: string | number, updateCampesinDto: UpdateCampesinDto) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    if (updateCampesinDto.telefono != null) {
      this.validatePhoneInput(updateCampesinDto.telefono);
    }

    if (updateCampesinDto.correo && updateCampesinDto.correo.trim()) {
      const emailVal = updateCampesinDto.correo.trim().toLowerCase();
      updateCampesinDto.correo = emailVal;
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailVal)) {
        throw new BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
      }

      const existing = await this.prisma.$queryRaw<Array<{ id_personas: string }>>(Prisma.sql`
        SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailVal}) AND id_personas::text <> ${String(campesino.id)} LIMIT 1
      `);
      if (existing[0]) {
        throw new ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
      }
    }





    let cedula: string | null = null;
    let tipoCedula: 'V' | 'E' | 'NP' | null = null;
    if (updateCampesinDto.cedula != null) {
      const normalizedCedula = normalizeCedulaInput(updateCampesinDto.cedula);
      if (!this.isValidCampesinoCedula(normalizedCedula)) {
        throw new BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
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
      await tx.$queryRaw(Prisma.sql`
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

      await tx.$queryRaw(Prisma.sql`
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
      throw new NotFoundException('No se pudo actualizar el campesino');
    }

    void this.recordAuditLog({
      tablaNombre: 'campesinos',
      registroId: String(campesino.id),
      accion: 'UPDATE',
      valoresAnteriores: { nombre: campesino.nombre, apellido: campesino.apellido },
      valoresNuevos: updateCampesinDto,
    });

    return this.mapCampesino(updated);
  }

  async remove(id: string | number) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    await this.prisma.$queryRaw(Prisma.sql`
      DELETE FROM registros.personas WHERE id_personas::text = ${String(campesino.id)}
    `);

    return { deleted: true };
  }

  async saveProfileImage(id: string | number, dto: SaveCampesinoProfileImageDto) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const storageId = await this.storageService.saveUsuarioPerfilImagen({
      usuarioId: campesino.id,
      contentType: dto.content_type,
      fileName: dto.file_name,
      sizeBytes: dto.size_bytes,
      imageBase64: dto.image_base64,
      imageUrl: dto.image_url,
      metadata: dto.metadata,
    });

    return {
      campesino_id: campesino.id,
      postgres_habilitado: this.storageService.isEnabled(),
      guardado_en_postgres: Boolean(storageId),
      registro_id: storageId,
    };
  }

  async getProfileImage(id: string | number) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const image = await this.storageService.getUsuarioPerfilImagen(campesino.id);

    return {
      campesino_id: campesino.id,
      postgres_habilitado: this.storageService.isEnabled(),
      imagen: image,
    };
  }

  async deleteProfileImage(id: string | number) {
    const campesino = await this.findCampesinoRow(id);
    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const deleted = await this.storageService.deleteUsuarioPerfilImagen(campesino.id);

    return {
      campesino_id: campesino.id,
      postgres_habilitado: this.storageService.isEnabled(),
      eliminado: deleted,
    };
  }
}