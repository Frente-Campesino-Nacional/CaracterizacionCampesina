export declare class CreateCampesinDto {
    cedula?: string;
    nombre: string;
    apellido?: string;
    telefono?: string;
    correo?: string;
    fecha_nacimiento?: string;
    genero?: string;
    estado_id?: number;
    municipio_id?: number;
    parroquia_id?: number;
    direccion?: string;
    consejo_id?: string | number;
    creado_por?: string | number;
    asignado_a?: string | number;
    tiene_pendientes?: boolean;
    metadata?: Record<string, unknown>;
}
