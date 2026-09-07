import { PrismaService } from '../../database/prisma.service';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';
export declare class ConsejosService {
    private prisma;
    constructor(prisma: PrismaService);
    private resolveUsuarioUuid;
    private mapConsejo;
    findAll(): Promise<{
        id: any;
        nombre: any;
        descripcion: any;
        estado_id: any;
        estado: any;
        municipio_id: any;
        municipio: any;
        parroquia_id: any;
        parroquia: any;
        encargado_tipo: any;
        encargado_id: any;
        encargado_nombre: any;
        creado_en: any;
        actualizado_en: any;
    }[]>;
    findOne(id: string | number): Promise<{
        id: any;
        nombre: any;
        descripcion: any;
        estado_id: any;
        estado: any;
        municipio_id: any;
        municipio: any;
        parroquia_id: any;
        parroquia: any;
        encargado_tipo: any;
        encargado_id: any;
        encargado_nombre: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    create(createConsejoDto: CreateConsejoDto): Promise<{
        id: any;
        nombre: any;
        descripcion: any;
        estado_id: any;
        estado: any;
        municipio_id: any;
        municipio: any;
        parroquia_id: any;
        parroquia: any;
        encargado_tipo: any;
        encargado_id: any;
        encargado_nombre: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    update(id: string | number, updateConsejoDto: UpdateConsejoDto): Promise<{
        id: any;
        nombre: any;
        descripcion: any;
        estado_id: any;
        estado: any;
        municipio_id: any;
        municipio: any;
        parroquia_id: any;
        parroquia: any;
        encargado_tipo: any;
        encargado_id: any;
        encargado_nombre: any;
        creado_en: any;
        actualizado_en: any;
    }>;
    remove(id: string | number): Promise<{
        deleted: boolean;
    }>;
}
