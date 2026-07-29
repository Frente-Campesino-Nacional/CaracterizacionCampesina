"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formularios_service_1 = require("./formularios.service");
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
        };
        const saveFormularioRespuesta = jest.fn().mockResolvedValue('response-1');
        const storageService = {
            saveFormularioRespuesta,
        };
        const service = new formularios_service_1.FormulariosService(prisma, storageService);
        await service.submitRespuesta('form-1', {
            respuestas: { respuesta: 'ok' },
            campesino_id: 'camp-1',
            encuestador_id: 'enc-1',
        }, 'enc-1');
        expect(saveFormularioRespuesta).toHaveBeenCalledWith(expect.objectContaining({
            formularioId: 'form-1',
            campesinoId: 'camp-1',
            encuestadorId: 'enc-1',
        }));
    });
});
//# sourceMappingURL=formularios.service.spec.js.map