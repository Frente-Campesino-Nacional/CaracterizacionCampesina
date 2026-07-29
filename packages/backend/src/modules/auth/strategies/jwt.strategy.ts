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
    const usuario = await this.prisma.$queryRaw<Array<{ id_usuario: string }>>(Prisma.sql`
      SELECT id_usuario
      FROM seguridad.usuarios
      WHERE id_usuario = CAST(${payload.sub} AS uuid)
      LIMIT 1
    `);

    if (!usuario[0]) {
      throw new UnauthorizedException('Usuario no válido');
    }

    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}