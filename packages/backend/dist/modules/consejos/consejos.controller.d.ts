import { ConsejosService } from './consejos.service';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';
export declare class ConsejosController {
    private readonly consejosService;
    constructor(consejosService: ConsejosService);
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
    findOne(id: string): Promise<{
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
    update(id: string, updateConsejoDto: UpdateConsejoDto): Promise<{
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
    remove(id: string): Promise<{
        deleted: boolean;
    }>;
}
