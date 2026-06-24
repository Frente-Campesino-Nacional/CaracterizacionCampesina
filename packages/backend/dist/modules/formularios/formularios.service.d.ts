import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioRespuestaDto } from './dto/submit-formulario-respuesta.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';
export declare class FormulariosService {
    private prisma;
    private mongoOptionalService;
    constructor(prisma: PrismaService, mongoOptionalService: MongoOptionalService);
    findAll(): Promise<{
        id: number;
        titulo: string;
        version: number;
        estructura: import("@prisma/client/runtime/library").JsonValue;
        activo: boolean;
        creado_por: number;
        creado_en: Date;
        actualizado_en: Date;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        titulo: string;
        version: number;
        estructura: import("@prisma/client/runtime/library").JsonValue;
        activo: boolean;
        creado_por: number;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    create(createFormularioDto: CreateFormularioDto): Promise<{
        id: number;
        titulo: string;
        version: number;
        estructura: import("@prisma/client/runtime/library").JsonValue;
        activo: boolean;
        creado_por: number;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    update(id: number, updateFormularioDto: UpdateFormularioDto): Promise<{
        id: number;
        titulo: string;
        version: number;
        estructura: import("@prisma/client/runtime/library").JsonValue;
        activo: boolean;
        creado_por: number;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    remove(id: number): Promise<{
        id: number;
        titulo: string;
        version: number;
        estructura: import("@prisma/client/runtime/library").JsonValue;
        activo: boolean;
        creado_por: number;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    submitRespuesta(formularioId: number, dto: SubmitFormularioRespuestaDto): Promise<{
        formulario_id: number;
        guardado_en_mongo: boolean;
        mongo_id: string;
    }>;
}
