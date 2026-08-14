import { PostgresStorageService } from '../../database/postgres-storage.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
export declare class UsuariosService {
    private prisma;
    private storageService;
    constructor(prisma: PrismaService, storageService: PostgresStorageService);
    private normalizeCatalogValue;
    private normalizeRoleValue;
    private resolveRoleId;
    private resolveConsejoUuid;
    private findUsuarioRow;
    private mapUsuario;
    private normalizeDateInput;
    private isValidUsuarioCedula;
    private randomNoCedulaCode;
    private parseCedulaData;
    private formatCedulaForResponse;
    findAll(requester: {
        rol: string;
    }): Promise<{
        id: any;
        cedula: string;
        email: any;
        nombre: any;
        apellido: any;
        rol: any;
        numero_telefono: any;
        fecha_nacimiento: any;
        genero: any;
        estado: any;
        municipio: any;
        parroquia: any;
        direccion: any;
        consejo_id: any;
        consejo_nombre: any;
        activo: boolean;
        foto_url: any;
        creado_en: any;
        actualizado_en: any;
    }[]>;
    findOne(id: string | number, requester: {
        rol: string;
    }): Promise<{
        id: any;
        cedula: string;
        email: any;
        nombre: any;
        apellido: any;
        rol: any;
        numero_telefono: any;
        fecha_nacimiento: any;
        genero: any;
        estado: any;
        municipio: any;
        parroquia: any;
        direccion: any;
        consejo_id: any;
        consejo_nombre: any;
        activo: boolean;
        foto_url: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    private isValidGmail;
    private validatePhoneInput;
    create(createUsuarioDto: CreateUsuarioDto): Promise<any>;
    update(id: string | number, updateUsuarioDto: UpdateUsuarioDto): Promise<any>;
    private generateUniqueCedula;
    remove(id: string | number): Promise<{
        deleted: boolean;
    }>;
    saveProfileImage(id: string | number, dto: SaveProfileImageDto): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        guardado_en_postgres: boolean;
        registro_id: string;
    }>;
    getProfileImage(id: string | number): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        imagen: Record<string, unknown>;
    }>;
    deleteProfileImage(id: string | number): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        eliminado: boolean;
    }>;
}
