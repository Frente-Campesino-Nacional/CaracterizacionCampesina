import { PrismaService } from '../../database/prisma.service';
export declare class CatalogosService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private loadUbicacionFromOperacional;
    private loadUbicacionFromCatalogos;
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
