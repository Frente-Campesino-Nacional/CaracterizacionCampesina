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

  it('returns audit-history rows alongside sync rows', async () => {
    const prisma = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([
          {
            id: 'sync-1',
            entidad: 'campesino',
            entidad_id: 'c-1',
            operacion: 'UPDATE',
            datos: { nombre: 'Ana' },
            estado: 'PENDIENTE',
            intentos: 0,
            error: null,
            creado_en: '2026-01-02T00:00:00.000Z',
            procesado_en: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'audit-1',
            entidad: 'campesino',
            entidad_id: 'c-2',
            operacion: 'UPDATE',
            datos: { nombre: 'Luis' },
            actor_nombre: 'María Admin',
            target_nombre: 'Luis',
            estado: 'PROCESADO',
            intentos: 0,
            error: null,
            creado_en: '2026-01-03T00:00:00.000Z',
            procesado_en: '2026-01-03T00:00:00.000Z',
          },
        ]),
    } as unknown as PrismaService;

    const service = new SyncService(prisma);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 'audit-1',
        entidad: 'campesino',
        entidad_id: 'c-2',
        operacion: 'UPDATE',
        datos: { nombre: 'Luis' },
        actor_nombre: 'María Admin',
        target_nombre: 'Luis',
        estado: 'PROCESADO',
        mensaje: 'Campesino Luis fue actualizado por María Admin',
        intentos: 0,
        error: null,
        creado_en: '2026-01-03T00:00:00.000Z',
        procesado_en: '2026-01-03T00:00:00.000Z',
      },
      {
        id: 'sync-1',
        entidad: 'campesino',
        entidad_id: 'c-1',
        operacion: 'UPDATE',
        datos: { nombre: 'Ana' },
        estado: 'PENDIENTE',
        intentos: 0,
        error: null,
        creado_en: '2026-01-02T00:00:00.000Z',
        procesado_en: null,
      },
    ]);
  });

  it('formats a human-readable message for audit rows', async () => {
    const prisma = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: 'audit-2',
            entidad: 'campesino',
            entidad_id: 'c-3',
            operacion: 'create',
            datos: { nombre: 'Ana' },
            actor_nombre: 'Juan',
            target_nombre: 'Ana',
            estado: 'PROCESADO',
            intentos: 0,
            error: null,
            creado_en: '2026-01-04T00:00:00.000Z',
            procesado_en: '2026-01-04T00:00:00.000Z',
          },
        ]),
    } as unknown as PrismaService;

    const service = new SyncService(prisma);

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 'audit-2',
        entidad: 'campesino',
        entidad_id: 'c-3',
        operacion: 'create',
        datos: { nombre: 'Ana' },
        actor_nombre: 'Juan',
        target_nombre: 'Ana',
        estado: 'PROCESADO',
        mensaje: 'Campesino Ana fue registrado por Juan',
        intentos: 0,
        error: null,
        creado_en: '2026-01-04T00:00:00.000Z',
        procesado_en: '2026-01-04T00:00:00.000Z',
      },
    ]);
  });
});
