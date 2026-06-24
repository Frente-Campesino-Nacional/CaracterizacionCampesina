import { Prisma } from '@prisma/client';
import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampesinDto } from './dto/create-campesino.dto';
import { UpdateCampesinDto } from './dto/update-campesino.dto';
import { SaveCampesinoProfileImageDto } from './dto/save-profile-image.dto';
export declare class CampesinosService {
    private prisma;
    private mongoOptionalService;
    constructor(prisma: PrismaService, mongoOptionalService: MongoOptionalService);
    private normalizeCatalogValue;
    private mapCampesino;
    private registerSyncRecord;
    private normalizeOptionalForeignKey;
    private validateForeignKeys;
    private normalizeDateInput;
    findAll(requester: {
        id: number;
        rol: string;
    }, consejoId?: number): Promise<{
        consejo_nombre: string;
        genero: string;
        id: number;
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        consejo: {
            nombre: string;
        };
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        creado_por: number;
        asignado_a: number;
        tiene_pendientes: boolean;
        metadata: Prisma.JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    }[]>;
    findOne(id: number, requester: {
        id: number;
        rol: string;
    }): Promise<{
        consejo_nombre: string;
        genero: string;
        id: number;
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        consejo: {
            nombre: string;
        };
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        creado_por: number;
        asignado_a: number;
        tiene_pendientes: boolean;
        metadata: Prisma.JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    } | {
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        genero: string;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        consejo_nombre: string;
        tiene_pendientes: boolean;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    create(createCampesinDto: CreateCampesinDto): Promise<{
        consejo_nombre: string;
        genero: string;
        id: number;
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        consejo: {
            nombre: string;
        };
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        creado_por: number;
        asignado_a: number;
        tiene_pendientes: boolean;
        metadata: Prisma.JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    update(id: number, updateCampesinDto: UpdateCampesinDto): Promise<{
        consejo_nombre: string;
        genero: string;
        id: number;
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        consejo: {
            nombre: string;
        };
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        creado_por: number;
        asignado_a: number;
        tiene_pendientes: boolean;
        metadata: Prisma.JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    }>;
    private generateUniqueCedula;
    remove(id: number): Promise<{
        id: number;
        cedula: string;
        nombre: string;
        apellido: string;
        telefono: string;
        correo: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        creado_por: number;
        asignado_a: number;
        tiene_pendientes: boolean;
        metadata: Prisma.JsonValue;
        creado_en: Date;
        actualizado_en: Date;
        generoId: number;
    }>;
    saveProfileImage(id: number, dto: SaveCampesinoProfileImageDto): Promise<{
        campesino_id: number;
        mongo_habilitado: boolean;
        guardado_en_mongo: boolean;
        mongo_id: string;
    }>;
    getProfileImage(id: number): Promise<{
        campesino_id: number;
        mongo_habilitado: boolean;
        imagen: Record<string, unknown>;
    }>;
    deleteProfileImage(id: number): Promise<{
        campesino_id: number;
        mongo_habilitado: boolean;
        eliminado: boolean;
    }>;
}
