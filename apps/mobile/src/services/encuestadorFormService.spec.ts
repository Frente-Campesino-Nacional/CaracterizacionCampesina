import { mergeFormularioResponseMetadata } from './encuestadorFormService';

describe('mergeFormularioResponseMetadata', () => {
  it('agrega un formulario nuevo sin duplicar IDs ya existentes', () => {
    const result = mergeFormularioResponseMetadata(
      { formularios_respondidos: ['form-1', 'form-2'] },
      'form-2',
    );

    expect(result).toEqual({ formularios_respondidos: ['form-1', 'form-2'] });
  });

  it('crea la estructura de metadatos cuando no existe', () => {
    const result = mergeFormularioResponseMetadata(null, 'form-3');

    expect(result).toEqual({ formularios_respondidos: ['form-3'] });
  });
});