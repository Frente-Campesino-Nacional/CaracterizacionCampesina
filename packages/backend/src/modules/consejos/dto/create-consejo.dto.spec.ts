import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateConsejoDto } from './create-consejo.dto';


describe('CreateConsejoDto', () => {
  it('permite un encargado vacío y lo maneja como valor opcional', async () => {
    const dto = new CreateConsejoDto();
    dto.nombre = 'Consejo de prueba';
    dto.encargado_id = '' as any;

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
