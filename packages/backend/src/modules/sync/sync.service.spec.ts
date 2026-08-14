import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  it('returns an empty list when the sync table is missing', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Error parsing query: db error: ERROR: relation "operacional.sincronizaciones" does not exist',
          { code: 'P2021', clientVersion: '5.22.0', meta: {} },
        ),
      ),
    } as unknown as PrismaService;

    const service = new SyncService(prisma);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('returns audit-history rows with field-level diffs', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'audit-1',
          tabla_nombre: 'operacional.campesinos',
          entidad_id: 'c-2',
          accion: 'UPDATE',
          valores_anteriores: { nombre: 'Luis', fecha_nacimiento: '1990-01-01' },
          valores_nuevos: { nombre: 'Luis', fecha_nacimiento: '1990-05-15' },
          usuario_id_reg: 'u-1',
          actor_nombre: 'María Admin',
          creado_en: '2026-01-03T00:00:00.000Z',
        },
      ]),
    } as unknown as PrismaService;

    const service = new SyncService(prisma);

    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].mensaje).toContain('Fecha de Nacimiento cambió de "1990-01-01" a "1990-05-15"');
    expect(result[0].mensaje).toContain('por María Admin');
  });

  it('formats a human-readable message for audit creation rows', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'audit-2',
          tabla_nombre: 'operacional.campesinos',
          entidad_id: 'c-3',
          accion: 'INSERT',
          valores_anteriores: null,
          valores_nuevos: { nombre: 'Ana', apellido: 'Pérez' },
          usuario_id_reg: 'u-2',
          actor_nombre: 'Juan',
          creado_en: '2026-01-04T00:00:00.000Z',
        },
      ]),
    } as unknown as PrismaService;

    const service = new SyncService(prisma);

    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].mensaje).toBe('Campesino "Ana Pérez" fue registrado por Juan');
  });
});

