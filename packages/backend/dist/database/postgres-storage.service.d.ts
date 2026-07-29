import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
type JsonMap = Record<string, unknown>;
interface FormularioRespuestaStorageInput {
    formularioId: string | number;
    campesinoId?: string | number | null;
    encuestadorId?: string | number | null;
    respuestas: JsonMap;
    metadata?: JsonMap;
    capturadoEn?: Date;
}
interface UsuarioPerfilImagenStorageInput {
    usuarioId: string | number;
    contentType: string;
    fileName?: string;
    sizeBytes?: number;
    imageBase64?: string;
    imageUrl?: string;
    metadata?: JsonMap;
}
interface CampesinoPerfilImagenStorageInput {
    campesinoId: string | number;
    contentType: string;
    fileName?: string;
    sizeBytes?: number;
    imageBase64?: string;
    imageUrl?: string;
    metadata?: JsonMap;
}
export declare class PostgresStorageService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    isEnabled(): boolean;
    private buildStoredImageUrl;
    private parseStoredImage;
    saveFormularioRespuesta(input: FormularioRespuestaStorageInput): Promise<string | null>;
    saveUsuarioPerfilImagen(input: UsuarioPerfilImagenStorageInput): Promise<string | null>;
    getUsuarioPerfilImagen(usuarioId: string | number): Promise<Record<string, unknown> | null>;
    deleteUsuarioPerfilImagen(usuarioId: string | number): Promise<boolean>;
    saveCampesinoPerfilImagen(input: CampesinoPerfilImagenStorageInput): Promise<string | null>;
    getCampesinoPerfilImagen(campesinoId: string | number): Promise<Record<string, unknown> | null>;
    deleteCampesinoPerfilImagen(campesinoId: string | number): Promise<boolean>;
}
export {};
