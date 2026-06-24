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
exports.ConsejosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const consejos_service_1 = require("./consejos.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const create_consejo_dto_1 = require("./dto/create-consejo.dto");
const update_consejo_dto_1 = require("./dto/update-consejo.dto");
let ConsejosController = class ConsejosController {
    constructor(consejosService) {
        this.consejosService = consejosService;
    }
    findAll() {
        return this.consejosService.findAll();
    }
    findOne(id) {
        return this.consejosService.findOne(id);
    }
    create(createConsejoDto) {
        return this.consejosService.create(createConsejoDto);
    }
    update(id, updateConsejoDto) {
        return this.consejosService.update(id, updateConsejoDto);
    }
    remove(id) {
        return this.consejosService.remove(id);
    }
};
exports.ConsejosController = ConsejosController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos los consejos' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConsejosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener consejo por ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ConsejosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo consejo' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_consejo_dto_1.CreateConsejoDto]),
    __metadata("design:returntype", void 0)
], ConsejosController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar consejo' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_consejo_dto_1.UpdateConsejoDto]),
    __metadata("design:returntype", void 0)
], ConsejosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar consejo' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ConsejosController.prototype, "remove", null);
exports.ConsejosController = ConsejosController = __decorate([
    (0, swagger_1.ApiTags)('Consejos'),
    (0, common_1.Controller)('consejos'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [consejos_service_1.ConsejosService])
], ConsejosController);
//# sourceMappingURL=consejos.controller.js.map