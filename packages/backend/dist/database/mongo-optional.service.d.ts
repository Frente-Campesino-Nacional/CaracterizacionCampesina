import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
type JsonMap = Record<string, unknown>;
interface FormularioRespuestaMongoInput {
    formularioId: number;
    campesinoId?: number;
    encuestadorId?: number;
    respuestas: JsonMap;
    metadata?: JsonMap;
    capturadoEn?: Date;
}
interface UsuarioPerfilImagenMongoInput {
    usuarioId: number;
    contentType: string;
    fileName?: string;
    sizeBytes?: number;
    imageBase64?: string;
    imageUrl?: string;
    metadata?: JsonMap;
}
interface CampesinoPerfilImagenMongoInput {
    campesinoId: number;
    contentType: string;
    fileName?: string;
    sizeBytes?: number;
    imageBase64?: string;
    imageUrl?: string;
    metadata?: JsonMap;
}
export declare class MongoOptionalService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private enabled;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    isEnabled(): boolean;
    saveFormularioRespuesta(input: FormularioRespuestaMongoInput): Promise<string | null>;
    saveUsuarioPerfilImagen(input: UsuarioPerfilImagenMongoInput): Promise<string | null>;
    getUsuarioPerfilImagen(usuarioId: number): Promise<Record<string, unknown> | null>;
    deleteUsuarioPerfilImagen(usuarioId: number): Promise<boolean>;
    saveCampesinoPerfilImagen(input: CampesinoPerfilImagenMongoInput): Promise<string | null>;
    getCampesinoPerfilImagen(campesinoId: number): Promise<Record<string, unknown> | null>;
    deleteCampesinoPerfilImagen(campesinoId: number): Promise<boolean>;
}
export {};
