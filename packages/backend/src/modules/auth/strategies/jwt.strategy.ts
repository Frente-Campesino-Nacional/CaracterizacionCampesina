import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email: string; rol: string }) {
    const usuario = await this.prisma.$queryRaw<Array<{ id_usuario: string; sync_status: string }>>(Prisma.sql`
      SELECT id_usuario, sync_status
      FROM seguridad.usuarios
      WHERE id_usuario = CAST(${payload.sub} AS uuid)
      LIMIT 1
    `);

    if (!usuario[0]) {
      throw new UnauthorizedException('Usuario no válido');
    }

    if (usuario[0].sync_status === 'disabled') {
      throw new UnauthorizedException('El usuario se encuentra inactivo. Comunícate con el administrador.');
    }

    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}