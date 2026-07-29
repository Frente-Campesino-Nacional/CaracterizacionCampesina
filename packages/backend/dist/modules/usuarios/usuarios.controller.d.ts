import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
export declare class UsuariosController {
    private readonly usuariosService;
    constructor(usuariosService: UsuariosService);
    findAll(req: any): Promise<{
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
        creado_en: any;
        actualizado_en: any;
    }[]>;
    findOne(req: any, id: string): Promise<{
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
        creado_en: any;
        actualizado_en: any;
    }>;
    create(createUsuarioDto: CreateUsuarioDto): Promise<any>;
    update(id: string, updateUsuarioDto: UpdateUsuarioDto): Promise<any>;
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
    saveProfileImage(id: string, saveProfileImageDto: SaveProfileImageDto): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        guardado_en_postgres: boolean;
        registro_id: string;
    }>;
    getProfileImage(id: string): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        imagen: Record<string, unknown>;
    }>;
    updateProfileImage(id: string, saveProfileImageDto: SaveProfileImageDto): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        guardado_en_postgres: boolean;
        registro_id: string;
    }>;
    deleteProfileImage(id: string): Promise<{
        usuario_id: any;
        postgres_habilitado: boolean;
        eliminado: boolean;
    }>;
}
