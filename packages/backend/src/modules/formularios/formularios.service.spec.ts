import { FormulariosService } from './formularios.service';
import { PrismaService } from '../../database/prisma.service';
import { PostgresStorageService } from '../../database/postgres-storage.service';

describe('FormulariosService', () => {
  it('passes the requester and campesino ids to the PostgreSQL storage layer', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id_formulario: 'form-1',
          titulo: 'Formulario',
          version: 1,
          estructura: {},
          activo: true,
          creado_por: 'user-1',
          creado_en: new Date('2024-01-01T00:00:00.000Z'),
          actualizado_en: new Date('2024-01-01T00:00:00.000Z'),
        },
      ]),
    } as unknown as PrismaService;

    const saveFormularioRespuesta = jest.fn().mockResolvedValue('response-1');
    const storageService = {
      saveFormularioRespuesta,
    } as unknown as PostgresStorageService;

    const service = new FormulariosService(prisma, storageService);

    await service.submitRespuesta(
      'form-1',
      {
        respuestas: { respuesta: 'ok' },
        campesino_id: 'camp-1',
        encuestador_id: 'enc-1',
      } as any,
      'enc-1',
    );

    expect(saveFormularioRespuesta).toHaveBeenCalledWith(expect.objectContaining({
      formularioId: 'form-1',
      campesinoId: 'camp-1',
      encuestadorId: 'enc-1',
    }));
  });
});
