"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HumanExceptionFilter = class HumanExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Ocurrió un error interno en el servidor';
        if (exception instanceof common_1.HttpException) {
            const resResponse = exception.getResponse();
            if (typeof resResponse === 'string') {
                message = this.translateMessage(resResponse);
            }
            else if (typeof resResponse === 'object' && resResponse !== null) {
                const rawMessage = resResponse.message;
                if (Array.isArray(rawMessage)) {
                    message = rawMessage.map((m) => this.translateMessage(String(m)));
                }
                else if (typeof rawMessage === 'string') {
                    message = this.translateMessage(rawMessage);
                }
            }
        }
        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
    translateMessage(msg) {
        const str = msg.trim();
        const lower = str.toLowerCase();
        if (lower.includes('email must be an email') || lower.includes('email invalido')) {
            return 'El correo electrónico no tiene un formato válido.';
        }
        if (lower.includes('should not be empty') || lower.includes('is required')) {
            return 'Todos los campos requeridos deben completarse.';
        }
        if (lower.includes('password must be longer than')) {
            return 'La contraseña debe tener al menos 8 caracteres.';
        }
        if (lower.includes('unauthorized') || lower.includes('invalid credentials')) {
            return 'El correo electrónico o la contraseña ingresados no son correctos.';
        }
        return str;
    }
};
exports.HumanExceptionFilter = HumanExceptionFilter;
exports.HumanExceptionFilter = HumanExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HumanExceptionFilter);
//# sourceMappingURL=human-exception.filter.js.map