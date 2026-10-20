export declare class UpdateCampesinDto {
    cedula?: string;
    nombre?: string;
    apellido?: string;
    telefono?: string;
    correo?: string;
    fecha_nacimiento?: string;
    sexo?: string;
    genero?: string;
    estado_id?: number;
    municipio_id?: number;
    parroquia_id?: number;
    direccion?: string;
    consejo_id?: string | number | null;
    creado_por?: string | number | null;
    asignado_a?: string | number | null;
    tiene_pendientes?: boolean;
    metadata?: Record<string, unknown>;
    es_administrador?: boolean;
    es_encuestador?: boolean;
    password?: string;
}
