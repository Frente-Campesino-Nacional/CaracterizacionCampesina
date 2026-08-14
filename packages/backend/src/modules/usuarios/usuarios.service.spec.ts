import { Prisma } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../../database/prisma.service';
import { PostgresStorageService } from '../../database/postgres-storage.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsuariosService.create', () => {
  it('uses the same UUID for the persona and the usuario to satisfy the foreign key', async () => {
    const prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    const storageService = {} as PostgresStorageService;
    const service = new UsuariosService(prisma, storageService);

    const sqlSpy = jest.spyOn(Prisma, 'sql').mockImplementation((strings: TemplateStringsArray | string[], ...values: unknown[]) => ({
      strings,
      values,
    }) as any);

    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id_rol: 2 }])
      .mockResolvedValueOnce([{ id_parroquia: 10 }])
      .mockResolvedValueOnce([{ id_genero: 3 }])
      .mockResolvedValueOnce([{ id: '11111111-1111-1111-1111-111111111111' }]);

    const txQueryRaw = jest.fn();
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: { $queryRaw: typeof txQueryRaw }) => Promise<void>) => {
      return callback({ $queryRaw: txQueryRaw });
    });

    await service.create({
      email: 'nuevo.usuario@gmail.com',

      password: '12345678',
      nombre: 'Juan',
      apellido: 'Pérez',
      rol: 'encuestador',
      cedula: 'V-123456',
    } as any);


    const firstInsertValues = txQueryRaw.mock.calls[0][0].values;
    const secondInsertValues = txQueryRaw.mock.calls[1][0].values;

    expect(firstInsertValues[0]).toEqual(secondInsertValues[0]);
    expect(firstInsertValues[0]).toMatch(/^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i);

    sqlSpy.mockRestore();
  });
});
