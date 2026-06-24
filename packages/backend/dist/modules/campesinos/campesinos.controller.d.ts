import { CampesinosService } from './campesinos.service';
import { CreateCampesinDto } from './dto/create-campesino.dto';
import { UpdateCampesinDto } from './dto/update-campesino.dto';
import { SaveCampesinoProfileImageDto } from './dto/save-profile-image.dto';
export declare class CampesinosController {
    private readonly campesinosService;
    constructor(campesinosService: CampesinosService);
    findAll(req: any, consejoId?: number): Promise<{
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
        metadata: import("@prisma/client/runtime/library").JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    }[]>;
    findOne(req: any, id: number): Promise<{
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
        metadata: import("@prisma/client/runtime/library").JsonValue;
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
        metadata: import("@prisma/client/runtime/library").JsonValue;
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
        metadata: import("@prisma/client/runtime/library").JsonValue;
        creado_en: Date;
        actualizado_en: Date;
    }>;
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
        metadata: import("@prisma/client/runtime/library").JsonValue;
        creado_en: Date;
        actualizado_en: Date;
        generoId: number;
    }>;
    saveProfileImage(id: number, saveCampesinoProfileImageDto: SaveCampesinoProfileImageDto): Promise<{
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
