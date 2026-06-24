import { PrismaService } from '../../database/prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id_rol: number;
        tipo_rol: string;
    }[]>;
}
