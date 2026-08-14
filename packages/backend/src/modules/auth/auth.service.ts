import { randomUUID } from 'crypto';
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type UsuarioAuthRecord = {
  id_usuario: string;
  email: string;
  password_hash: string;
  id_rol: number;
  tip_rol: string;
  creado_por: string | null;
  nombre_persona: string | null;
  apellido_persona: string | null;
  telefono_persona: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async findUsuarioAuthRecord(where: { email?: string; id?: string }) {
    if (where.email) {
      const rows = await this.prisma.$queryRaw<Array<UsuarioAuthRecord>>(Prisma.sql`
        SELECT
          u.id_usuario,
          p.email AS email,
          u.password_hash,
          u.id_rol,
          r.tip_rol,
          u.creado_por,
          u.sync_status,
          p.nombre AS nombre_persona,
          p.apellido AS apellido_persona,
          p.numero_telefonico AS telefono_persona
        FROM seguridad.usuarios u
        INNER JOIN seguridad.roles r ON r.id_rol = u.id_rol
        INNER JOIN registros.personas p ON p.id_personas = u.id_usuario

        WHERE LOWER(p.email) = LOWER(${where.email})
        LIMIT 1
      `);

      return rows[0] ?? null;
    }

    if (where.id) {
      const rows = await this.prisma.$queryRaw<Array<UsuarioAuthRecord>>(Prisma.sql`
        SELECT
          u.id_usuario,
          p.email AS email,
          u.password_hash,

          u.id_rol,
          r.tip_rol,
          u.creado_por,
          p.nombre AS nombre_persona,
          p.apellido AS apellido_persona,
          p.numero_telefonico AS telefono_persona
        FROM seguridad.usuarios u
        INNER JOIN seguridad.roles r ON r.id_rol = u.id_rol
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        WHERE u.id_usuario = CAST(${where.id} AS uuid)
        LIMIT 1
      `);

      return rows[0] ?? null;
    }

    return null;
  }

  private async resolveRoleId(role: string) {
    const normalizedRole = this.normalizeRoleValue(role);

    const existingRole = await this.prisma.$queryRaw<Array<{ id_rol: number }>>(Prisma.sql`
      SELECT id_rol
      FROM seguridad.roles
      WHERE LOWER(tip_rol) = LOWER(${normalizedRole})
      ORDER BY id_rol
      LIMIT 1
    `);

    if (existingRole[0]?.id_rol != null) {
      return existingRole[0].id_rol;
    }

    const createdRole = await this.prisma.$queryRaw<Array<{ id_rol: number }>>(Prisma.sql`
      INSERT INTO seguridad.roles (tip_rol, des_rol)
      VALUES (${normalizedRole}, ${normalizedRole})
      RETURNING id_rol
    `);

    if (createdRole[0]?.id_rol == null) {
      throw new UnauthorizedException('No se pudo resolver el rol del usuario');
    }

    return createdRole[0].id_rol;
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

  private mapUsuario(usuario: {
    id: string;
    email: string;
    nombre?: string;
    apellido?: string;
    telefono?: string | null;
    consejo_id?: string | null;
    rol: { tipo_rol: string };
    activo?: boolean;
    creado_en?: Date;
  }) {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre || usuario.email,
      apellido: usuario.apellido,
      telefono: usuario.telefono ?? null,
      rol: usuario.rol.tipo_rol,
      consejo_id: usuario.consejo_id ?? null,
      activo: usuario.activo ?? true,
      creado_en: usuario.creado_en,
    };
  }

  private async validatePassword(inputPassword: string, storedPassword: string) {
    if (!storedPassword) {
      return false;
    }

    if (storedPassword.startsWith('$2') || storedPassword.startsWith('$2a') || storedPassword.startsWith('$2b')) {
      return bcrypt.compare(inputPassword, storedPassword);
    }

    return inputPassword === storedPassword;
  }

  private async migratePlaintextPassword(userId: string, plaintextPassword: string) {
    const hashedPassword = await bcrypt.hash(plaintextPassword, 10);
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE seguridad.usuarios
      SET password_hash = ${hashedPassword}
      WHERE id_usuario::text = ${userId}
    `);
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.findUsuarioAuthRecord({ email: loginDto.email });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if ((usuario as any).sync_status === 'disabled') {
      throw new UnauthorizedException('El usuario se encuentra inactivo. Comunícate con el administrador.');
    }

    const isPasswordValid = await this.validatePassword(loginDto.password, usuario.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }


    if (!usuario.password_hash.startsWith('$2')) {
      await this.migratePlaintextPassword(usuario.id_usuario, loginDto.password);
    }

    const payload = { sub: usuario.id_usuario, email: usuario.email, rol: usuario.tip_rol };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.mapUsuario({
        id: usuario.id_usuario,
        email: usuario.email,
        nombre: usuario.nombre_persona || usuario.email,
        apellido: usuario.apellido_persona || '',
        telefono: usuario.telefono_persona || null,
        consejo_id: null,
        rol: { tipo_rol: usuario.tip_rol },
        activo: true,
      }),
    };
  }

  async register(registerDto: RegisterDto) {
    const emailVal = registerDto.email.trim().toLowerCase();
    registerDto.email = emailVal;

    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(emailVal)) {
      throw new BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
    }

    const existingUser = await this.findUsuarioAuthRecord({ email: emailVal });


    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }


    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const resolvedRole = this.normalizeRoleValue(registerDto.rol || 'encuestador');
    const roleId = await this.resolveRoleId(resolvedRole);
    const userUuid = randomUUID();
    const cedula = `${Math.floor(10000000 + Math.random() * 90000000)}`;
    const birthDate = new Date('1990-01-01T00:00:00.000Z');

    const parroquiaRows = await this.prisma.$queryRaw<Array<{ id_parroquia: number }>>(Prisma.sql`
      SELECT id_parroquia
      FROM catalogos.parroquias
      ORDER BY id_parroquia
      LIMIT 1
    `);

    const generoRows = await this.prisma.$queryRaw<Array<{ id_genero: number }>>(Prisma.sql`
      SELECT id_genero
      FROM catalogos.generos
      ORDER BY id_genero
      LIMIT 1
    `);

    const parroquiaId = parroquiaRows[0]?.id_parroquia;
    const generoId = generoRows[0]?.id_genero;

    if (parroquiaId == null || generoId == null) {
      throw new UnauthorizedException('No hay catálogos base disponibles para crear el usuario');
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
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
          CAST(${userUuid} AS uuid),
          ${registerDto.nombre},
          ${registerDto.apellido || ''},
          'V',
          ${cedula},
          ${birthDate},
          ${parroquiaId},
          ${registerDto.nombre},
          ${registerDto.email},
          NULL,
          ${generoId},
          NULL
        )
      `);

      await transaction.$queryRaw(Prisma.sql`
        INSERT INTO seguridad.usuarios (
          id_usuario,
          password_hash,
          id_rol,
          creado_por
        ) VALUES (
          CAST(${userUuid} AS uuid),
          ${hashedPassword},
          ${roleId},
          NULL
        )
      `);

    });

    const payload = { sub: userUuid, email: registerDto.email, rol: resolvedRole };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.mapUsuario({
        id: userUuid,
        email: registerDto.email,
        nombre: registerDto.nombre,
        apellido: registerDto.apellido,
        consejo_id: null,
        rol: { tipo_rol: resolvedRole },
        activo: true,
      }),
    };
  }

  async getProfile(userId: string) {
    const usuario = await this.findUsuarioAuthRecord({ id: userId });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.mapUsuario({
      id: usuario.id_usuario,
      email: usuario.email,
      nombre: usuario.nombre_persona || usuario.email,
      apellido: usuario.apellido_persona || '',
      consejo_id: null,
      rol: { tipo_rol: usuario.tip_rol },
      activo: true,
    });
  }

  async validateUser(email: string, password: string) {
    const usuario = await this.findUsuarioAuthRecord({ email });

    if (!usuario) {
      return null;
    }

    const isPasswordValid = await this.validatePassword(password, usuario.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    if (!usuario.password_hash.startsWith('$2')) {
      await this.migratePlaintextPassword(usuario.id_usuario, password);
    }

    return { id: usuario.id_usuario, email: usuario.email, rol: usuario.tip_rol };
  }
}