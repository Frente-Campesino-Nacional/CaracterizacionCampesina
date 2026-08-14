import { FormulariosService } from './formularios.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioRespuestaDto } from './dto/submit-formulario-respuesta.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';
export declare class FormulariosController {
    private readonly formulariosService;
    constructor(formulariosService: FormulariosService);
    findAll(): Promise<{
        id: any;
        titulo: any;
        version: any;
        estructura: any;
        activo: any;
        creado_por: any;
        creado_en: any;
        actualizado_en: any;
    }[]>;
    listFilterQuestions(): Promise<{
        formulario_id: string;
        formulario_titulo: string;
        pregunta_id: string;
        pregunta_label: string;
    }[]>;
    listFilterResults(formularioId: string, preguntaId: string): Promise<{
        campesino_id: any;
        cedula: any;
        nombre: any;
        apellido: any;
        telefono: any;
        email: any;
        consejo_nombre: any;
        estado: any;
        municipio: any;
        parroquia: any;
        pregunta_id: string;
        pregunta_label: string;
        formulario_titulo: any;
        valor: string;
        capturado_en: string;
    }[]>;
    findOne(id: string): Promise<{
        id: any;
        titulo: any;
        version: any;
        estructura: any;
        activo: any;
        creado_por: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    create(createFormularioDto: CreateFormularioDto): Promise<{
        id: any;
        titulo: any;
        version: any;
        estructura: any;
        activo: any;
        creado_por: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    update(id: string, updateFormularioDto: UpdateFormularioDto): Promise<{
        id: any;
        titulo: any;
        version: any;
        estructura: any;
        activo: any;
        creado_por: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    submitRespuesta(req: any, id: string, submitFormularioRespuestaDto: SubmitFormularioRespuestaDto): Promise<{
        formulario_id: any;
        guardado_en_postgres: boolean;
        registro_id: string;
    }>;
}
