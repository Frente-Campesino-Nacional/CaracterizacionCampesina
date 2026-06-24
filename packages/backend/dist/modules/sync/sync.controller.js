"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sync_service_1 = require("./sync.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const create_sync_dto_1 = require("./dto/create-sync.dto");
const update_sync_dto_1 = require("./dto/update-sync.dto");
let SyncController = class SyncController {
    constructor(syncService) {
        this.syncService = syncService;
    }
    findAll() {
        return this.syncService.findAll();
    }
    create(createSyncDto) {
        return this.syncService.create(createSyncDto);
    }
    update(id, updateSyncDto) {
        return this.syncService.update(id, updateSyncDto);
    }
    process(id) {
        return this.syncService.process(id);
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar registros de sincronización' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear registro de sincronización' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sync_dto_1.CreateSyncDto]),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar registro de sincronización' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_sync_dto_1.UpdateSyncDto]),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('process/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Procesar un registro de sincronización' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SyncController.prototype, "process", null);
exports.SyncController = SyncController = __decorate([
    (0, swagger_1.ApiTags)('Sincronización'),
    (0, common_1.Controller)('sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [sync_service_1.SyncService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map