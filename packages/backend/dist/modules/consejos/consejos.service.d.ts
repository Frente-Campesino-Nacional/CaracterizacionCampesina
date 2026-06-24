import { PrismaService } from '../../database/prisma.service';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';
export declare class ConsejosService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        campesinos: {
            id: number;
            cedula: string;
            nombre: string;
            apellido: string;
            telefono: string;
            correo: string;
            fecha_nacimiento: Date;
            generoId: number;
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
        }[];
    } & {
        id: number;
        nombre: string;
        estado: string;
        municipio: string;
        creado_en: Date;
        actualizado_en: Date;
        descripcion: string;
        encargado_tipo: string;
        encargado_id: number;
    })[]>;
    findOne(id: number): Promise<{
        campesinos: {
            id: number;
            cedula: string;
            nombre: string;
            apellido: string;
            telefono: string;
            correo: string;
            fecha_nacimiento: Date;
            generoId: number;
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
        }[];
    } & {
        id: number;
        nombre: string;
        estado: string;
        municipio: string;
        creado_en: Date;
        actualizado_en: Date;
        descripcion: string;
        encargado_tipo: string;
        encargado_id: number;
    }>;
    create(createConsejoDto: CreateConsejoDto): Promise<{
        campesinos: {
            id: number;
            cedula: string;
            nombre: string;
            apellido: string;
            telefono: string;
            correo: string;
            fecha_nacimiento: Date;
            generoId: number;
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
        }[];
    } & {
        id: number;
        nombre: string;
        estado: string;
        municipio: string;
        creado_en: Date;
        actualizado_en: Date;
        descripcion: string;
        encargado_tipo: string;
        encargado_id: number;
    }>;
    update(id: number, updateConsejoDto: UpdateConsejoDto): Promise<{
        campesinos: {
            id: number;
            cedula: string;
            nombre: string;
            apellido: string;
            telefono: string;
            correo: string;
            fecha_nacimiento: Date;
            generoId: number;
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
        }[];
    } & {
        id: number;
        nombre: string;
        estado: string;
        municipio: string;
        creado_en: Date;
        actualizado_en: Date;
        descripcion: string;
        encargado_tipo: string;
        encargado_id: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        nombre: string;
        estado: string;
        municipio: string;
        creado_en: Date;
        actualizado_en: Date;
        descripcion: string;
        encargado_tipo: string;
        encargado_id: number;
    }>;
}
