import { SyncService } from './sync.service';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';
export declare class SyncController {
    private readonly syncService;
    constructor(syncService: SyncService);
    findAll(): Promise<any[]>;
    create(createSyncDto: CreateSyncDto): Promise<any>;
    update(id: string, updateSyncDto: UpdateSyncDto): Promise<any>;
    process(id: string): Promise<any>;
}
