"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const usuarios_service_1 = require("./usuarios.service");
jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
}));
describe('UsuariosService.create', () => {
    it('uses the same UUID for the persona and the usuario to satisfy the foreign key', async () => {
        const prisma = {
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
        };
        const storageService = {};
        const service = new usuarios_service_1.UsuariosService(prisma, storageService);
        const sqlSpy = jest.spyOn(client_1.Prisma, 'sql').mockImplementation((strings, ...values) => ({
            strings,
            values,
        }));
        prisma.$queryRaw
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ id_rol: 2 }])
            .mockResolvedValueOnce([{ id_parroquia: 10 }])
            .mockResolvedValueOnce([{ id_genero: 3 }])
            .mockResolvedValueOnce([{ id: '11111111-1111-1111-1111-111111111111' }]);
        const txQueryRaw = jest.fn();
        prisma.$transaction.mockImplementation(async (callback) => {
            return callback({ $queryRaw: txQueryRaw });
        });
        await service.create({
            nombre_usuario: 'nuevo.usuario',
            email: 'nuevo.usuario@example.com',
            password: '12345678',
            nombre: 'Juan',
            apellido: 'Pérez',
            rol: 'encuestador',
            cedula: 'V-123456',
        });
        const firstInsertValues = txQueryRaw.mock.calls[0][0].values;
        const secondInsertValues = txQueryRaw.mock.calls[1][0].values;
        expect(firstInsertValues[0]).toEqual(secondInsertValues[0]);
        expect(firstInsertValues[0]).toMatch(/^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i);
        sqlSpy.mockRestore();
    });
});
//# sourceMappingURL=usuarios.service.spec.js.map