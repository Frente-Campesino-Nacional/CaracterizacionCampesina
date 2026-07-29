"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const campesinos_service_1 = require("./campesinos.service");
describe('CampesinosService', () => {
    it('does not query a non-existent consejo_id column from operational.campesinos', async () => {
        const prisma = {
            $queryRaw: jest.fn((query) => {
                const sql = String(query.sql ?? '');
                if (sql.includes('c.consejo_id')) {
                    throw new Error('Invalid column reference');
                }
                return Promise.resolve([
                    {
                        id: 'camp-1',
                        cedula: '11111111',
                        nombre: 'Carlos',
                        apellido: 'Mendoza',
                        telefono: '04121111111',
                        correo: 'campesino1@test.com',
                        fecha_nacimiento: '1985-08-10',
                        genero: 'Masculino',
                        estado: 'Táchira',
                        municipio: 'San Cristóbal',
                        parroquia: 'La Concordia',
                        direccion: 'Casa 1',
                        consejo_id: 'consejo-1',
                        creado_por: null,
                        asignado_a: null,
                        tiene_pendientes: false,
                        creado_en: 'camp-1',
                    },
                ]);
            }),
        };
        const service = new campesinos_service_1.CampesinosService(prisma, {});
        await expect(service.findOne('camp-1', { id: 'user-1', rol: 'admin' })).resolves.toMatchObject({
            id: 'camp-1',
            nombre: 'Carlos',
        });
    });
});
//# sourceMappingURL=campesinos.service.spec.js.map