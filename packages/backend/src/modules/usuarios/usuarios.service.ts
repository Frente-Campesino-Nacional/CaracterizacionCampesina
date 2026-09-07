import { randomUUID } from 'crypto';
import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PostgresStorageService } from '../../database/postgres-storage.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { normalizeCedulaInput } from '../../common/utils/cedula-code.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuariosService {
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
        SELECT id_parroquia FROM catalogos.parroquias WHERE municipio = ${input.municipioId} ORDER BY id_parroquia LIMIT 1
      `);
      if (rows[0]) return rows[0].id_parroquia;
    }

    if (input.estadoId != null) {
      const rows = await this.prisma.$queryRaw<Array<{ id_parroquia: number }>>(Prisma.sql`
        SELECT par.id_parroquia FROM catalogos.parroquias par
        JOIN catalogos.municipios m ON m.id_municipio = par.municipio
        WHERE m.estado = ${input.estadoId} ORDER BY par.id_parroquia LIMIT 1
      `);
      if (rows[0]) return rows[0].id_parroquia;
    }

    return 1;
  }

  private async resolveGeneroId(genero?: string | number | null): Promise<number> {
    if (genero == null || genero === '') return 2;
    if (typeof genero === 'number') return genero;
    const textVal = String(genero).trim().toLowerCase();
    if (textVal === 'femenino' || textVal === 'f' || textVal === '1') return 1;
    if (textVal === 'masculino' || textVal === 'm' || textVal === '2') return 2;
    return 2;
  }

  private normalizeCatalogValue(value?: string | null): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeRoleValue(value?: string | null): string {
    const normalized = this.normalizeCatalogValue(value)?.toLowerCase();
    if (!normalized || normalized === 'admin' || normalized === 'administrador') {
      return 'administrador';
    }

    return normalized;
  }

  private async resolveRoleId(role: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id_rol: number }>>(Prisma.sql`
      SELECT id_rol
      FROM seguridad.roles
      WHERE LOWER(tip_rol) = LOWER(${role})
      ORDER BY id_rol
      LIMIT 1
    `);

    if (rows[0]?.id_rol != null) {
      return rows[0].id_rol;
    }

    const inserted = await this.prisma.$queryRaw<Array<{ id_rol: number }>>(Prisma.sql`
      INSERT INTO seguridad.roles (tip_rol, des_rol)
      VALUES (${role}, ${role})
      RETURNING id_rol
    `);

    return inserted[0]?.id_rol ?? 1;
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

  private async findUsuarioRow(identifier: string | number) {
    const textValue = String(identifier).trim();
    const rows = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT
        u.id_usuario AS id,
        p.tipo_cedula,
        p.cedula,
        p.email AS email,
        p.nombre,
        p.apellido,
        r.tip_rol AS rol,
        p.numero_telefonico AS numero_telefono,
        p.fecha_nacimiento,
        g.sexo AS genero,
        g.sexo AS sexo,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.nombre_consejo AS consejo_nombre,
        CASE WHEN COALESCE(u.sync_status, 'synced') = 'disabled' THEN FALSE ELSE TRUE END AS activo,
        p.creado_en AS creado_en,
        p.actualizado_en AS actualizado_en
      FROM seguridad.usuarios u
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      LEFT JOIN operacional.consejos c ON c.consejo_id = p.consejo_id
      LEFT JOIN catalogos.generos g ON g.id_sexo = p.sexo
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = u.id_usuario

      WHERE u.id_usuario::text = ${textValue}
         OR LOWER(p.email) = LOWER(${textValue})
      LIMIT 1
    `);


    return rows[0] ?? null;
  }

  private mapUsuario(usuario: any) {
    return {
      id: usuario.id,
      cedula: this.formatCedulaForResponse(usuario.tipo_cedula, usuario.cedula),
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      numero_telefono: usuario.numero_telefono,
      fecha_nacimiento: usuario.fecha_nacimiento
        ? (usuario.fecha_nacimiento instanceof Date
            ? usuario.fecha_nacimiento.toISOString().slice(0, 10)
            : String(usuario.fecha_nacimiento).slice(0, 10))
        : null,

      genero: usuario.genero || null,
      estado_id: usuario.estado_id ?? null,
      estado: usuario.estado || null,
      municipio_id: usuario.municipio_id ?? null,
      municipio: usuario.municipio || null,
      parroquia_id: usuario.parroquia_id ?? null,
      parroquia: usuario.parroquia || null,
      direccion: usuario.direccion,
      consejo_id: usuario.consejo_id ?? null,
      consejo_nombre: usuario.consejo_nombre || null,
      activo: Boolean(usuario.activo),
      foto_url: usuario.foto_url || null,
      creado_en: usuario.creado_en,
      actualizado_en: usuario.actualizado_en ?? usuario.creado_en,
    };
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

  private isValidUsuarioCedula(value: string): boolean {
    return /^([VE]-\d{6,9}|[A-Z]\d{3}|\d{6,9})$/.test(value);
  }

  private randomNoCedulaCode(): string {
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const digits = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${letter}${digits}`;
  }

  private parseCedulaData(value?: string) {
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

  async findAll(requester?: { rol: string }) {
    const usuarios = await this.prisma.$queryRaw<Array<any>>(Prisma.sql`
      SELECT
        u.id_usuario AS id,
        p.tipo_cedula,
        p.cedula,
        p.email AS email,
        p.nombre,
        p.apellido,
        r.tip_rol AS rol,
        p.numero_telefonico AS numero_telefono,
        p.fecha_nacimiento,
        g.sexo AS genero,
        g.sexo AS sexo,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.nombre_consejo AS consejo_nombre,
        CASE WHEN COALESCE(u.sync_status, 'synced') = 'disabled' THEN FALSE ELSE TRUE END AS activo,
        fp.url_nube AS foto_url,
        p.creado_en AS creado_en,
        p.actualizado_en AS actualizado_en
      FROM seguridad.usuarios u
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      LEFT JOIN operacional.consejos c ON c.consejo_id = p.consejo_id
      LEFT JOIN catalogos.generos g ON g.id_sexo = p.sexo
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = u.id_usuario
      ORDER BY p.email
    `);

    return usuarios.map((usuario) => this.mapUsuario(usuario));
  }

  async findOne(id: string | number, requester?: { rol: string }) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapUsuario(usuario);
  }

  private isValidGmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
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

  async create(createUsuarioDto: CreateUsuarioDto) {
    if (createUsuarioDto.numero_telefono) {
      this.validatePhoneInput(createUsuarioDto.numero_telefono);
    }

    const emailValue = createUsuarioDto.email.trim().toLowerCase();
    if (!this.isValidGmail(emailValue)) {

      throw new BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
    }

    const existingUser = await this.prisma.$queryRaw<Array<{ id_personas: string }>>(Prisma.sql`
      SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailValue}) LIMIT 1
    `);

    if (existingUser[0]) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
    }



    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);
    const roleId = await this.resolveRoleId(this.normalizeRoleValue(createUsuarioDto.rol || 'encuestador'));

    let tipoCedula: 'V' | 'E' | 'NP';
    let cedula: string;
    if (createUsuarioDto.cedula) {
      const normalizedCedula = normalizeCedulaInput(createUsuarioDto.cedula);
      if (!this.isValidUsuarioCedula(normalizedCedula)) {
        throw new BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
      }

      const parsedCedula = this.parseCedulaData(normalizedCedula);
      tipoCedula = parsedCedula.tipoCedula;
      cedula = parsedCedula.cedula;
    } else {
      tipoCedula = 'NP';
      cedula = await this.generateUniqueCedula();
    }

    const parroquiaId = await this.resolveParroquiaId({
      parroquiaId: createUsuarioDto.parroquia_id,
      municipioId: createUsuarioDto.municipio_id,
      estadoId: createUsuarioDto.estado_id,
    });

    const generoId = await this.resolveGeneroId(createUsuarioDto.sexo ?? createUsuarioDto.genero);

    const consejoUuid = createUsuarioDto.consejo_id
      ? await this.resolveConsejoUuid(createUsuarioDto.consejo_id)
      : null;

    const sharedEntityId = randomUUID();
    const birthDate = createUsuarioDto.fecha_nacimiento ? this.normalizeDateInput(createUsuarioDto.fecha_nacimiento) : null;

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
          sexo,
          consejo_id
        ) VALUES (
          CAST(${sharedEntityId} AS uuid),
          ${createUsuarioDto.nombre || ''},
          ${createUsuarioDto.apellido || ''},
          CAST(${tipoCedula} AS registros.tipo_cedula_enum),
          ${cedula},
          ${birthDate ?? new Date('1990-01-01T00:00:00.000Z')},
          ${parroquiaId},
          ${createUsuarioDto.direccion || ''},
          ${emailValue},
          ${createUsuarioDto.numero_telefono ?? null},
          ${generoId},
          CASE
            WHEN CAST(${consejoUuid ?? null} AS text) IS NULL THEN NULL
            ELSE CAST(${consejoUuid ?? null} AS uuid)
          END
        )
      `);

      await tx.$queryRaw(Prisma.sql`
        INSERT INTO seguridad.usuarios (
          id_usuario,
          password_hash,
          id_rol,
          creado_por
        ) VALUES (
          CAST(${sharedEntityId} AS uuid),
          ${hashedPassword},
          ${roleId},
          NULL
        )
      `);
    });

    return this.findUsuarioRow(sharedEntityId);
  }

  async update(id: string | number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const data: any = { ...updateUsuarioDto };
    const currentUserId = usuario.id;

    if (data.password !== undefined) {
      if (typeof data.password !== 'string' || !data.password.trim()) {
        throw new BadRequestException('La contraseña no puede estar vacía');
      }

      data.password_hash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    if (typeof data.activo === 'boolean') {
      const syncStatus = data.activo ? 'synced' : 'disabled';
      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE seguridad.usuarios SET sync_status = ${syncStatus} WHERE id_usuario::text = ${String(currentUserId)}
      `);
      delete data.activo;
    }

    if (data.email) {
      const emailVal = data.email.trim().toLowerCase();
      if (!this.isValidGmail(emailVal)) {
        throw new BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
      }

      const existing = await this.prisma.$queryRaw<Array<{ id_personas: string }>>(Prisma.sql`
        SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailVal}) AND id_personas::text <> ${String(currentUserId)} LIMIT 1
      `);
      if (existing[0]) {
        throw new ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
      }


      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE registros.personas SET email = ${emailVal} WHERE id_personas::text = ${String(currentUserId)}
      `);
      delete data.email;
    }

    if (data.numero_telefono != null) {
      this.validatePhoneInput(data.numero_telefono);
    }






    if (data.password_hash !== undefined) {
      const passwordHashValue = typeof data.password_hash === 'string' ? data.password_hash.trim() : '';
      if (!passwordHashValue) {
        throw new BadRequestException('El hash de la contraseña no puede estar vacío');
      }

      const normalizedHash = passwordHashValue.startsWith('$2')
        ? passwordHashValue
        : await bcrypt.hash(passwordHashValue, 10);

      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE seguridad.usuarios SET password_hash = ${normalizedHash} WHERE id_usuario::text = ${String(currentUserId)}
      `);
      delete data.password_hash;
    }

    if (data.rol) {
      const roleId = await this.resolveRoleId(this.normalizeRoleValue(data.rol));
      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE seguridad.usuarios SET id_rol = ${roleId} WHERE id_usuario::text = ${String(currentUserId)}
      `);
      delete data.rol;
    }

    const hasPersonaChanges = (
      data.nombre != null ||
      data.apellido != null ||
      data.direccion != null ||
      data.numero_telefono != null ||
      data.fecha_nacimiento != null ||
      data.consejo_id != null ||
      data.sexo != null ||
      data.genero != null ||
      data.parroquia_id != null ||
      data.municipio_id != null ||
      data.estado_id != null
    );

    if (hasPersonaChanges) {
      const normalizedBirthDate = data.fecha_nacimiento != null
        ? (this.normalizeDateInput(data.fecha_nacimiento) ?? null)
        : null;
      const normalizedConsejoId = data.consejo_id != null
        ? await this.resolveConsejoUuid(data.consejo_id)
        : null;

      const parroquiaId = (data.parroquia_id != null || data.municipio_id != null || data.estado_id != null)
        ? await this.resolveParroquiaId({
            parroquiaId: data.parroquia_id,
            municipioId: data.municipio_id,
            estadoId: data.estado_id,
          })
        : null;

      const generoId = (data.sexo != null || data.genero != null)
        ? await this.resolveGeneroId(data.sexo ?? data.genero)
        : null;

      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE registros.personas
        SET
          nombre = COALESCE(${data.nombre ?? null}, nombre),
          apellido = COALESCE(${data.apellido ?? null}, apellido),
          direccion_usuario = COALESCE(${data.direccion ?? null}, direccion_usuario),
          numero_telefonico = COALESCE(${data.numero_telefono ?? null}, numero_telefonico),
          fecha_nacimiento = COALESCE(CAST(${normalizedBirthDate ?? null} AS date), fecha_nacimiento),
          parroquia = COALESCE(CAST(${parroquiaId ?? null} AS integer), parroquia),
          sexo = COALESCE(CAST(${generoId ?? null} AS integer), sexo),
          consejo_id = CASE
            WHEN CAST(${normalizedConsejoId ?? null} AS text) IS NULL THEN consejo_id
            ELSE CAST(${normalizedConsejoId ?? null} AS uuid)
          END,
          actualizado_en = NOW()
        WHERE id_personas::text = ${String(currentUserId)}
      `);
    }

    const updatedUser = await this.findUsuarioRow(id);

    if (updatedUser) {
      void this.recordAuditLog({
        tablaNombre: 'usuarios',
        registroId: String(updatedUser.id),
        accion: 'UPDATE',
        valoresAnteriores: { nombre: usuario.nombre, apellido: usuario.apellido },
        valoresNuevos: data,
      });
    }

    return updatedUser;
  }

  private async generateUniqueCedula(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = this.randomNoCedulaCode();
      const existing = await this.prisma.$queryRaw<Array<{ cedula: string }>>(Prisma.sql`
        SELECT cedula FROM registros.personas WHERE cedula = ${candidate} LIMIT 1
      `);
      if (!existing[0]) {
        return candidate;
      }
    }

    throw new ConflictException('No se pudo generar un código NP único, intente nuevamente');
  }

  async remove(id: string | number) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const userUuid = String(usuario.id);

    // Buscar un administrador alternativo para reasignar formularios y campesinos creados por este usuario
    const fallbackAdmin = await this.prisma.$queryRaw<Array<{ id_usuario: string }>>(Prisma.sql`
      SELECT id_usuario FROM seguridad.usuarios
      WHERE id_usuario::text <> ${userUuid} AND id_rol = 1
      LIMIT 1
    `);
    const fallbackAdminId = fallbackAdmin[0]?.id_usuario ?? null;

    // 1. Reasignar formularios creados por este usuario para evitar error 23502 de NOT NULL
    if (fallbackAdminId) {
      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE operacional.formularios SET creado_por = CAST(${fallbackAdminId} AS uuid) WHERE creado_por::text = ${userUuid}
      `);
    }

    // 2. Reasignar o limpiar relaciones en operacional.campesinos
    if (fallbackAdminId) {
      await this.prisma.$queryRaw(Prisma.sql`
        UPDATE operacional.campesinos SET creado_por = CAST(${fallbackAdminId} AS uuid) WHERE creado_por::text = ${userUuid}
      `);
    }
    await this.prisma.$queryRaw(Prisma.sql`
      UPDATE operacional.campesinos SET asignado_a = NULL WHERE asignado_a::text = ${userUuid}
    `);

    // 3. Limpiar encargado en operacional.consejos
    await this.prisma.$queryRaw(Prisma.sql`
      UPDATE operacional.consejos SET encargado_id = NULL WHERE encargado_id::text = ${userUuid}
    `);

    // 4. Eliminar foto de perfil
    try {
      await this.prisma.$queryRaw(Prisma.sql`
        DELETE FROM operacional.fotos_perfil WHERE persona_id::text = ${userUuid}
      `);
    } catch {
      // Ignorar si no existe foto
    }

    // 5. Eliminar registros principales
    await this.prisma.$queryRaw(Prisma.sql`
      DELETE FROM seguridad.usuarios WHERE id_usuario::text = ${userUuid}
    `);

    await this.prisma.$queryRaw(Prisma.sql`
      DELETE FROM registros.personas WHERE id_personas::text = ${userUuid}
    `);

    void this.recordAuditLog({
      tablaNombre: 'usuarios',
      registroId: userUuid,
      accion: 'DELETE',
      valoresAnteriores: { nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email },
    });

    return { deleted: true };
  }

  async saveProfileImage(id: string | number, dto: SaveProfileImageDto) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const storageId = await this.storageService.saveUsuarioPerfilImagen({
      usuarioId: usuario.id,
      contentType: dto.content_type,
      fileName: dto.file_name,
      sizeBytes: dto.size_bytes,
      imageBase64: dto.image_base64,
      imageUrl: dto.image_url,
      metadata: dto.metadata,
    });

    return {
      usuario_id: usuario.id,
      postgres_habilitado: this.storageService.isEnabled(),
      guardado_en_postgres: Boolean(storageId),
      registro_id: storageId,
    };
  }

  async getProfileImage(id: string | number) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const image = await this.storageService.getUsuarioPerfilImagen(usuario.id);

    return {
      usuario_id: usuario.id,
      postgres_habilitado: this.storageService.isEnabled(),
      imagen: image,
    };
  }

  async deleteProfileImage(id: string | number) {
    const usuario = await this.findUsuarioRow(id);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const deleted = await this.storageService.deleteUsuarioPerfilImagen(usuario.id);

    return {
      usuario_id: usuario.id,
      postgres_habilitado: this.storageService.isEnabled(),
      eliminado: deleted,
    };
  }
}