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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async findUsuarioAuthRecord(where) {
        if (where.email) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          u.id_usuario,
          p.email AS email,
          u.password_hash,
          u.id_rol,
          r.tip_rol,
          u.creado_por,
          p.nombre AS nombre_persona,
          p.apellido AS apellido_persona,
          p.numero_telefonico AS telefono_persona
        FROM seguridad.usuarios u
        INNER JOIN seguridad.roles r ON r.id_rol = u.id_rol
        INNER JOIN registros.personas p ON p.id_personas = u.id_usuario
        WHERE LOWER(p.email) = LOWER(${where.email})
        LIMIT 1
      `);
            return rows[0] ?? null;
        }
        if (where.id) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          u.id_usuario,
          COALESCE(p.email, u.nombre_usuario) AS email,
          u.password_hash,
          u.id_rol,
          r.tip_rol,
          u.creado_por,
          p.nombre AS nombre_persona,
          p.apellido AS apellido_persona,
          p.numero_telefonico AS telefono_persona
        FROM seguridad.usuarios u
        INNER JOIN seguridad.roles r ON r.id_rol = u.id_rol
        LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
        WHERE u.id_usuario = CAST(${where.id} AS uuid)
        LIMIT 1
      `);
            return rows[0] ?? null;
        }
        return null;
    }
    async resolveRoleId(role) {
        const normalizedRole = this.normalizeRoleValue(role);
        const existingRole = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_rol
      FROM seguridad.roles
      WHERE LOWER(tip_rol) = LOWER(${normalizedRole})
      ORDER BY id_rol
      LIMIT 1
    `);
        if (existingRole[0]?.id_rol != null) {
            return existingRole[0].id_rol;
        }
        const createdRole = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO seguridad.roles (tip_rol, des_rol)
      VALUES (${normalizedRole}, ${normalizedRole})
      RETURNING id_rol
    `);
        if (createdRole[0]?.id_rol == null) {
            throw new common_1.UnauthorizedException('No se pudo resolver el rol del usuario');
        }
        return createdRole[0].id_rol;
    }
    normalizeCatalogValue(value) {
        const normalized = value?.trim();
        return normalized ? normalized : undefined;
    }
    normalizeRoleValue(value) {
        const normalized = this.normalizeCatalogValue(value)?.toLowerCase();
        if (!normalized || normalized === 'admin' || normalized === 'administrador') {
            return 'administrador';
        }
        return normalized;
    }
    mapUsuario(usuario) {
        return {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.nombre || usuario.email,
            apellido: usuario.apellido,
            telefono: usuario.telefono ?? null,
            rol: usuario.rol.tipo_rol,
            consejo_id: usuario.consejo_id ?? null,
            activo: usuario.activo ?? true,
            creado_en: usuario.creado_en,
        };
    }
    async validatePassword(inputPassword, storedPassword) {
        if (!storedPassword) {
            return false;
        }
        if (storedPassword.startsWith('$2') || storedPassword.startsWith('$2a') || storedPassword.startsWith('$2b')) {
            return bcrypt.compare(inputPassword, storedPassword);
        }
        return inputPassword === storedPassword;
    }
    async migratePlaintextPassword(userId, plaintextPassword) {
        const hashedPassword = await bcrypt.hash(plaintextPassword, 10);
        await this.prisma.$executeRaw(client_1.Prisma.sql `
      UPDATE seguridad.usuarios
      SET password_hash = ${hashedPassword}
      WHERE id_usuario::text = ${userId}
    `);
    }
    async login(loginDto) {
        const usuario = await this.findUsuarioAuthRecord({ email: loginDto.email });
        if (!usuario) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const isPasswordValid = await this.validatePassword(loginDto.password, usuario.password_hash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        if (!usuario.password_hash.startsWith('$2')) {
            await this.migratePlaintextPassword(usuario.id_usuario, loginDto.password);
        }
        const payload = { sub: usuario.id_usuario, email: usuario.email, rol: usuario.tip_rol };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: this.mapUsuario({
                id: usuario.id_usuario,
                email: usuario.email,
                nombre: usuario.nombre_persona || usuario.email,
                apellido: usuario.apellido_persona || '',
                telefono: usuario.telefono_persona || null,
                consejo_id: null,
                rol: { tipo_rol: usuario.tip_rol },
                activo: true,
            }),
        };
    }
    async register(registerDto) {
        const existingUser = await this.findUsuarioAuthRecord({ email: registerDto.email });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado');
        }
        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const resolvedRole = this.normalizeRoleValue(registerDto.rol || 'encuestador');
        const roleId = await this.resolveRoleId(resolvedRole);
        const userUuid = (0, crypto_1.randomUUID)();
        const cedula = `${Math.floor(10000000 + Math.random() * 90000000)}`;
        const birthDate = new Date('1990-01-01T00:00:00.000Z');
        const parroquiaRows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_parroquia
      FROM catalogos.parroquias
      ORDER BY id_parroquia
      LIMIT 1
    `);
        const generoRows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_genero
      FROM catalogos.generos
      ORDER BY id_genero
      LIMIT 1
    `);
        const parroquiaId = parroquiaRows[0]?.id_parroquia;
        const generoId = generoRows[0]?.id_genero;
        if (parroquiaId == null || generoId == null) {
            throw new common_1.UnauthorizedException('No hay catálogos base disponibles para crear el usuario');
        }
        await this.prisma.$transaction(async (transaction) => {
            await transaction.$queryRaw(client_1.Prisma.sql `
        INSERT INTO registros.personas (
          id_personas,
          nombre,
          apellido,
          tipo_cedula,
          cedula,
          fecha_nacimiento,
          parroquia,
          direccion_usuario,
          email,
          numero_telefonico,
          genero,
          consejo_id
        ) VALUES (
          CAST(${userUuid} AS uuid),
          ${registerDto.nombre},
          ${registerDto.apellido || ''},
          'V',
          ${cedula},
          ${birthDate},
          ${parroquiaId},
          ${registerDto.nombre},
          ${registerDto.email},
          NULL,
          ${generoId},
          NULL
        )
      `);
            await transaction.$queryRaw(client_1.Prisma.sql `
        INSERT INTO seguridad.usuarios (
          id_usuario,
          nombre_usuario,
          password_hash,
          id_rol,
          creado_por
        ) VALUES (
          CAST(${userUuid} AS uuid),
          ${registerDto.email},
          ${hashedPassword},
          ${roleId},
          NULL
        )
      `);
        });
        const payload = { sub: userUuid, email: registerDto.email, rol: resolvedRole };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: this.mapUsuario({
                id: userUuid,
                email: registerDto.email,
                nombre: registerDto.nombre,
                apellido: registerDto.apellido,
                consejo_id: null,
                rol: { tipo_rol: resolvedRole },
                activo: true,
            }),
        };
    }
    async getProfile(userId) {
        const usuario = await this.findUsuarioAuthRecord({ id: userId });
        if (!usuario) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        return this.mapUsuario({
            id: usuario.id_usuario,
            email: usuario.email,
            nombre: usuario.nombre_persona || usuario.email,
            apellido: usuario.apellido_persona || '',
            consejo_id: null,
            rol: { tipo_rol: usuario.tip_rol },
            activo: true,
        });
    }
    async validateUser(email, password) {
        const usuario = await this.findUsuarioAuthRecord({ email });
        if (!usuario) {
            return null;
        }
        const isPasswordValid = await this.validatePassword(password, usuario.password_hash);
        if (!isPasswordValid) {
            return null;
        }
        if (!usuario.password_hash.startsWith('$2')) {
            await this.migratePlaintextPassword(usuario.id_usuario, password);
        }
        return { id: usuario.id_usuario, email: usuario.email, rol: usuario.tip_rol };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map