import { CatalogosService } from './catalogos.service';
export declare class CatalogosController {
    private readonly catalogosService;
    constructor(catalogosService: CatalogosService);
    getUbicacionCatalogos(): Promise<{
        estados: {
            id: number;
            nombre: string;
            municipios: {
                id: number;
                nombre: string;
                parroquias: {
                    id: number;
                    nombre: string;
                }[];
            }[];
        }[];
    }>;
}
