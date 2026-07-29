"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const auth_service_1 = require("./auth.service");
describe('AuthService', () => {
    it('allows login with email and a plain-text password stored in the database', async () => {
        const prisma = {
            $queryRaw: jest.fn().mockResolvedValue([
                {
                    id_usuario: 'user-1',
                    email: 'admin@test.com',
                    password_hash: '12345678',
                    id_rol: 1,
                    tip_rol: 'Administrador',
                    creado_por: null,
                },
            ]),
            $executeRaw: jest.fn().mockResolvedValue(undefined),
        };
        const jwtService = {
            sign: jest.fn().mockReturnValue('token-test'),
        };
        const service = new auth_service_1.AuthService(prisma, jwtService);
        await expect(service.login({ email: 'admin@test.com', password: '12345678' })).resolves.toMatchObject({
            access_token: 'token-test',
            user: { email: 'admin@test.com' },
        });
    });
    it('returns the person name and email from the persona record when logging in', async () => {
        const passwordHash = bcrypt.hashSync('12345678', 10);
        const prisma = {
            $queryRaw: jest.fn().mockResolvedValue([
                {
                    id_usuario: 'user-2',
                    email: 'nuevo_admin@test.com',
                    password_hash: passwordHash,
                    id_rol: 1,
                    tip_rol: 'Administrador',
                    creado_por: null,
                    nombre_persona: 'Ana',
                    apellido_persona: 'García',
                },
            ]),
        };
        const jwtService = {
            sign: jest.fn().mockReturnValue('token-test-2'),
        };
        const service = new auth_service_1.AuthService(prisma, jwtService);
        await expect(service.login({ email: 'nuevo_admin@test.com', password: '12345678' })).resolves.toMatchObject({
            access_token: 'token-test-2',
            user: {
                email: 'nuevo_admin@test.com',
                nombre: 'Ana',
                apellido: 'García',
            },
        });
    });
    it('rejects invalid credentials', async () => {
        const prisma = {
            $queryRaw: jest.fn().mockResolvedValue([]),
        };
        const jwtService = {
            sign: jest.fn(),
        };
        const service = new auth_service_1.AuthService(prisma, jwtService);
        await expect(service.login({ email: 'missing@test.com', password: '12345678' })).rejects.toBeInstanceOf(common_1.UnauthorizedException);
    });
});
//# sourceMappingURL=auth.service.spec.js.map