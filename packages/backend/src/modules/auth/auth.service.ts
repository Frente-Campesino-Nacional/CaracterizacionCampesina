import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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
    id: number;
    email: string;
    nombre: string;
    rol: { tipo_rol: string };
    activo?: boolean;
    creado_en?: Date;
  }) {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol.tipo_rol,
      activo: usuario.activo,
      creado_en: usuario.creado_en,
    };
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: loginDto.email },
      include: {
        rol: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, usuario.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.mapUsuario(usuario),
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: registerDto.email,
        password_hash: hashedPassword,
        nombre: registerDto.nombre,
        apellido: registerDto.apellido || '',
        rol: {
          connectOrCreate: {
            where: { tipo_rol: this.normalizeRoleValue(registerDto.rol || 'encuestador') },
            create: { tipo_rol: this.normalizeRoleValue(registerDto.rol || 'encuestador') },
          },
        },
      },
      include: {
        rol: true,
      },
    });

    const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: this.mapUsuario(usuario),
    };
  }

  async getProfile(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: {
          select: { tipo_rol: true },
        },
        activo: true,
        creado_en: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.mapUsuario(usuario as { id: number; email: string; nombre: string; rol: { tipo_rol: string }; activo: boolean; creado_en: Date });
  }

  async validateUser(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        rol: true,
      },
    });

    if (!usuario) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
    if (!isPasswordValid || !usuario.activo) {
      return null;
    }

    return { id: usuario.id, email: usuario.email, rol: usuario.rol.tipo_rol };
  }
}