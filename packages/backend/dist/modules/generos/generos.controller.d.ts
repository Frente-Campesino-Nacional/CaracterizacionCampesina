import { GenerosService } from './generos.service';
export declare class GenerosController {
    private readonly generosService;
    constructor(generosService: GenerosService);
    findAll(): Promise<{
        id_gen: number;
        tipo_gen: string;
    }[]>;
}
