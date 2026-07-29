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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const catalogos_service_1 = require("./catalogos.service");
let CatalogosController = class CatalogosController {
    constructor(catalogosService) {
        this.catalogosService = catalogosService;
    }
    getUbicacionCatalogos() {
        return this.catalogosService.getUbicacionCatalogos();
    }
};
exports.CatalogosController = CatalogosController;
__decorate([
    (0, common_1.Get)('ubicacion'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener estados, municipios y parroquias' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogosController.prototype, "getUbicacionCatalogos", null);
exports.CatalogosController = CatalogosController = __decorate([
    (0, swagger_1.ApiTags)('Catalogos'),
    (0, common_1.Controller)('catalogos'),
    __metadata("design:paramtypes", [catalogos_service_1.CatalogosService])
], CatalogosController);
//# sourceMappingURL=catalogos.controller.js.map