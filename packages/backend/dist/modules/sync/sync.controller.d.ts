import { SyncService } from './sync.service';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    findAll(): Promise<{
        error: string;
        id: number;
        estado: string;
        creado_en: Date;
        entidad: string;
        entidad_id: number;
        operacion: string;
        datos: import("@prisma/client/runtime/library").JsonValue;
        intentos: number;
        procesado_en: Date;
    }[]>;
    create(createSyncDto: CreateSyncDto): Promise<{
        error: string;
        id: number;
        estado: string;
        creado_en: Date;
        entidad: string;
        entidad_id: number;
        operacion: string;
        datos: import("@prisma/client/runtime/library").JsonValue;
        intentos: number;
        procesado_en: Date;
    }>;
    update(id: number, updateSyncDto: UpdateSyncDto): Promise<{
        error: string;
        id: number;
        estado: string;
        creado_en: Date;
        entidad: string;
        entidad_id: number;
        operacion: string;
        datos: import("@prisma/client/runtime/library").JsonValue;
        intentos: number;
        procesado_en: Date;
    }>;
    process(id: number): Promise<{
        error: string;
        id: number;
        estado: string;
        creado_en: Date;
        entidad: string;
        entidad_id: number;
        operacion: string;
        datos: import("@prisma/client/runtime/library").JsonValue;
        intentos: number;
        procesado_en: Date;
    }>;
}
