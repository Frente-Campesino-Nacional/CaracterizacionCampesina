"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerosModule = void 0;
const common_1 = require("@nestjs/common");
const generos_controller_1 = require("./generos.controller");
const generos_service_1 = require("./generos.service");
let GenerosModule = class GenerosModule {
};
exports.GenerosModule = GenerosModule;
exports.GenerosModule = GenerosModule = __decorate([
    (0, common_1.Module)({
        controllers: [generos_controller_1.GenerosController],
        providers: [generos_service_1.GenerosService],
        exports: [generos_service_1.GenerosService],
    })
], GenerosModule);
//# sourceMappingURL=generos.module.js.map