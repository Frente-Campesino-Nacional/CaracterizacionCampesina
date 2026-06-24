export declare class CreateUsuarioDto {
    email: string;
    cedula?: string;
    password: string;
    nombre: string;
    apellido: string;
    rol?: 'admin' | 'administrador' | 'encuestador';
    numero_telefono?: string;
    fecha_nacimiento?: string;
    genero?: string;
    estado?: string;
    municipio?: string;
    direccion?: string;
    consejo_id?: number;
    activo?: boolean;
    creado_en?: string;
    actualizado_en?: string;
}
