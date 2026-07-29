"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_validator_1 = require("class-validator");
const create_consejo_dto_1 = require("./create-consejo.dto");
describe('CreateConsejoDto', () => {
    it('permite un encargado vacío y lo maneja como valor opcional', async () => {
        const dto = new create_consejo_dto_1.CreateConsejoDto();
        dto.nombre = 'Consejo de prueba';
        dto.encargado_id = '';
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors).toHaveLength(0);
    });
});
//# sourceMappingURL=create-consejo.dto.spec.js.map