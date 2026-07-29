"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogosModule = void 0;
const common_1 = require("@nestjs/common");
const catalogos_controller_1 = require("./catalogos.controller");
const catalogos_service_1 = require("./catalogos.service");
let CatalogosModule = class CatalogosModule {
};
exports.CatalogosModule = CatalogosModule;
exports.CatalogosModule = CatalogosModule = __decorate([
    (0, common_1.Module)({
        controllers: [catalogos_controller_1.CatalogosController],
        providers: [catalogos_service_1.CatalogosService],
    })
], CatalogosModule);
//# sourceMappingURL=catalogos.module.js.map