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
exports.UsuariosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const usuarios_service_1 = require("./usuarios.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const create_usuario_dto_1 = require("./dto/create-usuario.dto");
const save_profile_image_dto_1 = require("./dto/save-profile-image.dto");
const update_usuario_dto_1 = require("./dto/update-usuario.dto");
let UsuariosController = class UsuariosController {
    constructor(usuariosService) {
        this.usuariosService = usuariosService;
    }
    findAll(req) {
        return this.usuariosService.findAll(req.user);
    }
    findOne(req, id) {
        return this.usuariosService.findOne(id, req.user);
    }
    create(createUsuarioDto) {
        return this.usuariosService.create(createUsuarioDto);
    }
    update(id, updateUsuarioDto) {
        return this.usuariosService.update(id, updateUsuarioDto);
    }
    remove(id) {
        return this.usuariosService.remove(id);
    }
    saveProfileImage(id, saveProfileImageDto) {
        return this.usuariosService.saveProfileImage(id, saveProfileImageDto);
    }
    getProfileImage(id) {
        return this.usuariosService.getProfileImage(id);
    }
    updateProfileImage(id, saveProfileImageDto) {
        return this.usuariosService.saveProfileImage(id, saveProfileImageDto);
    }
    deleteProfileImage(id) {
        return this.usuariosService.deleteProfileImage(id);
    }
};
exports.UsuariosController = UsuariosController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos los usuarios' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener usuario por ID' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo usuario' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_usuario_dto_1.CreateUsuarioDto]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar usuario' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_usuario_dto_1.UpdateUsuarioDto]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar usuario' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar imagen de perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_profile_image_dto_1.SaveProfileImageDto]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "saveProfileImage", null);
__decorate([
    (0, common_1.Get)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener imagen de perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "getProfileImage", null);
__decorate([
    (0, common_1.Put)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar imagen de perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_profile_image_dto_1.SaveProfileImageDto]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "updateProfileImage", null);
__decorate([
    (0, common_1.Delete)(':id/foto-perfil'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar imagen de perfil' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UsuariosController.prototype, "deleteProfileImage", null);
exports.UsuariosController = UsuariosController = __decorate([
    (0, swagger_1.ApiTags)('Usuarios'),
    (0, common_1.Controller)('usuarios'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [usuarios_service_1.UsuariosService])
], UsuariosController);
//# sourceMappingURL=usuarios.controller.js.map