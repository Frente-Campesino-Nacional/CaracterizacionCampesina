import { PrismaService } from '../../database/prisma.service';
export declare class GenerosService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id_genero: number;
        tipo_gen: string;
    }[]>;
}
