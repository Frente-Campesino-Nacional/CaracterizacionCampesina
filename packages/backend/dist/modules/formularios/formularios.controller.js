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
exports.FormulariosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const formularios_service_1 = require("./formularios.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const create_formulario_dto_1 = require("./dto/create-formulario.dto");
const submit_formulario_respuesta_dto_1 = require("./dto/submit-formulario-respuesta.dto");
const update_formulario_dto_1 = require("./dto/update-formulario.dto");
let FormulariosController = class FormulariosController {
    constructor(formulariosService) {
        this.formulariosService = formulariosService;
    }
    findAll() {
        return this.formulariosService.findAll();
    }
    findOne(id) {
        return this.formulariosService.findOne(id);
    }
    create(createFormularioDto) {
        return this.formulariosService.create(createFormularioDto);
    }
    update(id, updateFormularioDto) {
        return this.formulariosService.update(id, updateFormularioDto);
    }
    remove(id) {
        return this.formulariosService.remove(id);
    }
    submitRespuesta(id, submitFormularioRespuestaDto) {
        return this.formulariosService.submitRespuesta(id, submitFormularioRespuestaDto);
    }
};
exports.FormulariosController = FormulariosController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todos los formularios' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener formulario por ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo formulario' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_formulario_dto_1.CreateFormularioDto]),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar formulario' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_formulario_dto_1.UpdateFormularioDto]),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar formulario' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/respuestas'),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar respuesta de formulario en MongoDB' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, submit_formulario_respuesta_dto_1.SubmitFormularioRespuestaDto]),
    __metadata("design:returntype", void 0)
], FormulariosController.prototype, "submitRespuesta", null);
exports.FormulariosController = FormulariosController = __decorate([
    (0, swagger_1.ApiTags)('Formularios'),
    (0, common_1.Controller)('formularios'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [formularios_service_1.FormulariosService])
], FormulariosController);
//# sourceMappingURL=formularios.controller.js.map