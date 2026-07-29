import { PrismaService } from '../../database/prisma.service';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';
export declare class SyncService {
    private prisma;
    constructor(prisma: PrismaService);
    private isMissingRelationError;
    findAll(): Promise<any[]>;
    private loadSyncRows;
    private loadAuditRows;
    create(createSyncDto: CreateSyncDto): Promise<any>;
    update(id: string, updateSyncDto: UpdateSyncDto): Promise<any>;
    process(id: string): Promise<any>;
}
