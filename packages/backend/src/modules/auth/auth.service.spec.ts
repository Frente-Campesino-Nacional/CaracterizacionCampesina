import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

describe('AuthService', () => {
  it('allows login with email and a plain-text password stored in the database', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id_usuario: 'user-1',
          email: 'admin@test.com',
          password_hash: '12345678',
          id_rol: 1,
          tip_rol: 'Administrador',
          creado_por: null,
        },
      ]),
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    } as unknown as PrismaService;

    const jwtService = {
      sign: jest.fn().mockReturnValue('token-test'),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwtService);

    await expect(
      service.login({ email: 'admin@test.com', password: '12345678' } as any),
    ).resolves.toMatchObject({
      access_token: 'token-test',
      user: { email: 'admin@test.com' },
    });
  });

  it('returns the person name and email from the persona record when logging in', async () => {
    const passwordHash = bcrypt.hashSync('12345678', 10);
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id_usuario: 'user-2',
          email: 'nuevo_admin@test.com',
          password_hash: passwordHash,
          id_rol: 1,
          tip_rol: 'Administrador',
          creado_por: null,
          nombre_persona: 'Ana',
          apellido_persona: 'García',
        },
      ]),
    } as unknown as PrismaService;

    const jwtService = {
      sign: jest.fn().mockReturnValue('token-test-2'),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwtService);

    await expect(
      service.login({ email: 'nuevo_admin@test.com', password: '12345678' } as any),
    ).resolves.toMatchObject({
      access_token: 'token-test-2',
      user: {
        email: 'nuevo_admin@test.com',
        nombre: 'Ana',
        apellido: 'García',
      },
    });
  });

  it('rejects invalid credentials', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    const jwtService = {
      sign: jest.fn(),
    } as unknown as JwtService;

    const service = new AuthService(prisma, jwtService);

    await expect(
      service.login({ email: 'missing@test.com', password: '12345678' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
