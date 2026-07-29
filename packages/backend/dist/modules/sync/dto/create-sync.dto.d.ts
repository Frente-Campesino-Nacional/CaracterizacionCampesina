export declare class CreateSyncDto {
    entidad: string;
    entidad_id: string;
    operacion: string;
    datos: object;
    estado?: string;
    intentos?: number;
    error?: string;
    procesado_en?: string;
}
