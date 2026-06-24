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
exports.CampesinosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const campesinos_service_1 = require("./campesinos.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const create_campesino_dto_1 = require("./dto/create-campesino.dto");
const update_campesino_dto_1 = require("./dto/update-campesino.dto");
const save_profile_image_dto_1 = require("./dto/save-profile-image.dto");
let CampesinosController = class CampesinosController {
    constructor(campesinosService) {
        this.campesinosService = campesinosService;
    }
    findAll(req, consejoId) {
        return this.campesinosService.findAll(req.user, consejoId);
    }
    findOne(req, id) {
        return this.campesinosService.findOne(id, req.user);
    }
    create(createCampesinDto) {
        return this.campesinosService.create(createCampesinDto);
    }
    update(id, updateCampesinDto) {
        return this.campesinosService.update(id, updateCampesinDto);
    }
    remove(id) {
        return this.campesinosService.remove(id);
    }
    saveProfileImage(id, saveCampesinoProfileImageDto) {
        return this.campesinosService.saveProfileImage(id, saveCampesinoProfileImageDto);
    }
    getProfileImage(id) {
        return this.campesinosService.getProfileImage(id);
    }
    deleteProfileImage(id) {
        return this.campesinosService.deleteProfileImage(id);
    }
};
exports.CampesinosController = CampesinosController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar campesinos' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('consejoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener campesino por ID' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo campesino' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_campesino_dto_1.CreateCampesinDto]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar campesino' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_campesino_dto_1.UpdateCampesinDto]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar campesino' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar imagen de perfil del campesino en Mongo opcional' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, save_profile_image_dto_1.SaveCampesinoProfileImageDto]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "saveProfileImage", null);
__decorate([
    (0, common_1.Get)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener imagen de perfil del campesino en Mongo opcional' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "getProfileImage", null);
__decorate([
    (0, common_1.Delete)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar imagen de perfil del campesino en Mongo opcional' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CampesinosController.prototype, "deleteProfileImage", null);
exports.CampesinosController = CampesinosController = __decorate([
    (0, swagger_1.ApiTags)('Campesinos'),
    (0, common_1.Controller)('campesinos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [campesinos_service_1.CampesinosService])
], CampesinosController);
//# sourceMappingURL=campesinos.controller.js.map