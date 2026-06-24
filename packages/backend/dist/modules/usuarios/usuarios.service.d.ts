import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
export declare class UsuariosService {
    private prisma;
    private mongoOptionalService;
    constructor(prisma: PrismaService, mongoOptionalService: MongoOptionalService);
    private normalizeCatalogValue;
    private normalizeRoleValue;
    private mapUsuario;
    private normalizeDateInput;
    findAll(requester: {
        rol: string;
    }): Promise<{
        rol: string;
        genero: string;
        consejo_nombre: string;
        id: number;
        cedula: string;
        email: string;
        nombre: string;
        apellido: string;
        numero_telefono: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        activo: boolean;
        creado_en: Date;
    }[]>;
    findOne(id: number, requester: {
        rol: string;
    }): Promise<{
        rol: string;
        genero: string;
        consejo_nombre: string;
        id: number;
        cedula: string;
        email: string;
        nombre: string;
        apellido: string;
        numero_telefono: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        activo: boolean;
        creado_en: Date;
    }>;
    create(createUsuarioDto: CreateUsuarioDto): Promise<{
        rol: string;
        genero: string;
        consejo_nombre: string;
        id: number;
        cedula: string;
        email: string;
        nombre: string;
        apellido: string;
        numero_telefono: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        activo: boolean;
        creado_en: Date;
    }>;
    update(id: number, updateUsuarioDto: UpdateUsuarioDto): Promise<{
        rol: string;
        genero: string;
        consejo_nombre: string;
        id: number;
        cedula: string;
        email: string;
        nombre: string;
        apellido: string;
        numero_telefono: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        activo: boolean;
        creado_en: Date;
    }>;
    private generateUniqueCedula;
    remove(id: number): Promise<{
        id: number;
        cedula: string;
        email: string;
        nombre: string;
        apellido: string;
        numero_telefono: string;
        fecha_nacimiento: Date;
        estado: string;
        municipio: string;
        direccion: string;
        consejo_id: number;
        activo: boolean;
        creado_en: Date;
        password_hash: string;
        rolId: number;
        generoId: number;
        actualizado_en: Date;
    }>;
    saveProfileImage(id: number, dto: SaveProfileImageDto): Promise<{
        usuario_id: number;
        mongo_habilitado: boolean;
        guardado_en_mongo: boolean;
        mongo_id: string;
    }>;
    getProfileImage(id: number): Promise<{
        usuario_id: number;
        mongo_habilitado: boolean;
        imagen: Record<string, unknown>;
    }>;
    deleteProfileImage(id: number): Promise<{
        usuario_id: number;
        mongo_habilitado: boolean;
        eliminado: boolean;
    }>;
}
