import { PostgresStorageService } from '../../database/postgres-storage.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioRespuestaDto } from './dto/submit-formulario-respuesta.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';
export declare class FormulariosService {
    private prisma;
    private storageService;
    constructor(prisma: PrismaService, storageService: PostgresStorageService);
    private findFormularioRow;
    private mapFormulario;
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
    findOne(id: string | number): Promise<{
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
    update(id: string | number, updateFormularioDto: UpdateFormularioDto): Promise<{
        id: any;
        titulo: any;
        version: any;
        estructura: any;
        activo: any;
        creado_por: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    remove(id: string | number): Promise<{
        deleted: boolean;
    }>;
    submitRespuesta(formularioId: string | number, dto: SubmitFormularioRespuestaDto, requesterId?: string): Promise<{
        formulario_id: any;
        guardado_en_postgres: boolean;
        registro_id: string;
    }>;
    listFilterQuestions(): Promise<{
        formulario_id: string;
        formulario_titulo: string;
        pregunta_id: string;
        pregunta_label: string;
    }[]>;
    listFilterResults(formularioId: string | number, preguntaId: string): Promise<{
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
    private hasCompletedValue;
    private formatAnswerValue;
}
