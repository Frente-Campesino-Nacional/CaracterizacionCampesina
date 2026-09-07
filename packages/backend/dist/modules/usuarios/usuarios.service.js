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
exports.UsuariosService = void 0;
const crypto_1 = require("crypto");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const postgres_storage_service_1 = require("../../database/postgres-storage.service");
const prisma_service_1 = require("../../database/prisma.service");
const cedula_code_util_1 = require("../../common/utils/cedula-code.util");
const bcrypt = __importStar(require("bcryptjs"));
let UsuariosService = class UsuariosService {
    constructor(prisma, storageService) {
        this.prisma = prisma;
        this.storageService = storageService;
    }
    async recordAuditLog(params) {
        try {
            const userUuid = params.usuarioId ? client_1.Prisma.sql `CAST(${params.usuarioId} AS uuid)` : client_1.Prisma.sql `NULL`;
            const regUuid = client_1.Prisma.sql `CAST(${params.registroId} AS uuid)`;
            const oldJson = params.valoresAnteriores ? JSON.stringify(params.valoresAnteriores) : null;
            const newJson = params.valoresNuevos ? JSON.stringify(params.valoresNuevos) : null;
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        INSERT INTO auditoria.historial_cambios (
          id_historial,
          usuario_id_reg,
          tabla_nombre,
          registro_id,
          accion,
          valores_anteriores,
          valores_nuevos,
          origen,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${userUuid},
          ${params.tablaNombre},
          ${regUuid},
          ${params.accion},
          ${oldJson ? client_1.Prisma.sql `CAST(${oldJson} AS jsonb)` : client_1.Prisma.sql `NULL`},
          ${newJson ? client_1.Prisma.sql `CAST(${newJson} AS jsonb)` : client_1.Prisma.sql `NULL`},
          'MOBILE_APP',
          NOW()
        )
      `);
        }
        catch {
        }
    }
    async resolveParroquiaId(input) {
        if (input.parroquiaId != null) {
            return input.parroquiaId;
        }
        if (input.municipioId != null) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_parroquia FROM catalogos.parroquias WHERE municipio = ${input.municipioId} ORDER BY id_parroquia LIMIT 1
      `);
            if (rows[0])
                return rows[0].id_parroquia;
        }
        if (input.estadoId != null) {
            const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT par.id_parroquia FROM catalogos.parroquias par
        JOIN catalogos.municipios m ON m.id_municipio = par.municipio
        WHERE m.estado = ${input.estadoId} ORDER BY par.id_parroquia LIMIT 1
      `);
            if (rows[0])
                return rows[0].id_parroquia;
        }
        return 1;
    }
    async resolveGeneroId(genero) {
        if (genero == null || genero === '')
            return 2;
        if (typeof genero === 'number')
            return genero;
        const textVal = String(genero).trim().toLowerCase();
        if (textVal === 'femenino' || textVal === 'f' || textVal === '1')
            return 1;
        if (textVal === 'masculino' || textVal === 'm' || textVal === '2')
            return 2;
        return 2;
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
    async resolveRoleId(role) {
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_rol
      FROM seguridad.roles
      WHERE LOWER(tip_rol) = LOWER(${role})
      ORDER BY id_rol
      LIMIT 1
    `);
        if (rows[0]?.id_rol != null) {
            return rows[0].id_rol;
        }
        const inserted = await this.prisma.$queryRaw(client_1.Prisma.sql `
      INSERT INTO seguridad.roles (tip_rol, des_rol)
      VALUES (${role}, ${role})
      RETURNING id_rol
    `);
        return inserted[0]?.id_rol ?? 1;
    }
    async resolveConsejoUuid(value) {
        if (value == null || value === '') {
            return null;
        }
        const textValue = String(value).trim();
        if (!textValue) {
            return null;
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT consejo_id
      FROM operacional.consejos
      WHERE consejo_id::text = ${textValue}
      LIMIT 1
    `);
        return rows[0]?.consejo_id ?? null;
    }
    async findUsuarioRow(identifier) {
        const textValue = String(identifier).trim();
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        u.id_usuario AS id,
        p.tipo_cedula,
        p.cedula,
        p.email AS email,
        p.nombre,
        p.apellido,
        r.tip_rol AS rol,
        p.numero_telefonico AS numero_telefono,
        p.fecha_nacimiento,
        g.genero AS genero,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.nombre_consejo AS consejo_nombre,
        CASE WHEN COALESCE(u.sync_status, 'synced') = 'disabled' THEN FALSE ELSE TRUE END AS activo,
        fp.url_nube AS foto_url,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM seguridad.usuarios u
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      LEFT JOIN operacional.consejos c ON c.consejo_id = p.consejo_id
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = u.id_usuario

      WHERE u.id_usuario::text = ${textValue}
         OR LOWER(p.email) = LOWER(${textValue})
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    mapUsuario(usuario) {
        return {
            id: usuario.id,
            cedula: this.formatCedulaForResponse(usuario.tipo_cedula, usuario.cedula),
            email: usuario.email,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            rol: usuario.rol,
            numero_telefono: usuario.numero_telefono,
            fecha_nacimiento: usuario.fecha_nacimiento
                ? (usuario.fecha_nacimiento instanceof Date
                    ? usuario.fecha_nacimiento.toISOString().slice(0, 10)
                    : String(usuario.fecha_nacimiento).slice(0, 10))
                : null,
            genero: usuario.genero || null,
            estado_id: usuario.estado_id ?? null,
            estado: usuario.estado || null,
            municipio_id: usuario.municipio_id ?? null,
            municipio: usuario.municipio || null,
            parroquia_id: usuario.parroquia_id ?? null,
            parroquia: usuario.parroquia || null,
            direccion: usuario.direccion,
            consejo_id: usuario.consejo_id ?? null,
            consejo_nombre: usuario.consejo_nombre || null,
            activo: Boolean(usuario.activo),
            foto_url: usuario.foto_url || null,
            creado_en: usuario.creado_en,
            actualizado_en: usuario.actualizado_en ?? usuario.creado_en,
        };
    }
    normalizeDateInput(value) {
        if (!value) {
            return undefined;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T00:00:00.000Z`);
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    isValidUsuarioCedula(value) {
        return /^([VE]-\d{6,9}|[A-Z]\d{3}|\d{6,9})$/.test(value);
    }
    randomNoCedulaCode() {
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const digits = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `${letter}${digits}`;
    }
    parseCedulaData(value) {
        if (!value) {
            return { tipoCedula: 'NP', cedula: '' };
        }
        const normalized = (0, cedula_code_util_1.normalizeCedulaInput)(value);
        const prefixedMatch = normalized.match(/^([VE])-(\d{6,9})$/);
        if (prefixedMatch) {
            return {
                tipoCedula: prefixedMatch[1],
                cedula: prefixedMatch[2],
            };
        }
        if (/^[A-Z]\d{3}$/.test(normalized)) {
            return { tipoCedula: 'NP', cedula: normalized };
        }
        if (/^\d{6,9}$/.test(normalized)) {
            return { tipoCedula: 'V', cedula: normalized };
        }
        return { tipoCedula: 'NP', cedula: '' };
    }
    formatCedulaForResponse(tipoCedula, cedula) {
        if (!cedula) {
            return '';
        }
        if (tipoCedula === 'V' || tipoCedula === 'E') {
            return `${tipoCedula}-${cedula}`;
        }
        return cedula;
    }
    async findAll(requester) {
        const usuarios = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        u.id_usuario AS id,
        p.tipo_cedula,
        p.cedula,
        p.email AS email,
        p.nombre,
        p.apellido,
        r.tip_rol AS rol,
        p.numero_telefonico AS numero_telefono,
        p.fecha_nacimiento,
        g.genero AS genero,
        e.id_estados AS estado_id,
        e.nombre_estado AS estado,
        m.id_municipio AS municipio_id,
        m.nombre_municipio AS municipio,
        par.id_parroquia AS parroquia_id,
        par.nombre_parroquia AS parroquia,
        p.direccion_usuario AS direccion,
        p.consejo_id AS consejo_id,
        c.nombre_consejo AS consejo_nombre,
        CASE WHEN COALESCE(u.sync_status, 'synced') = 'disabled' THEN FALSE ELSE TRUE END AS activo,
        fp.url_nube AS foto_url,
        p.created_at AS creado_en,
        p.update_at AS actualizado_en
      FROM seguridad.usuarios u
      LEFT JOIN registros.personas p ON p.id_personas = u.id_usuario
      LEFT JOIN seguridad.roles r ON r.id_rol = u.id_rol
      LEFT JOIN operacional.consejos c ON c.consejo_id = p.consejo_id
      LEFT JOIN catalogos.generos g ON g.id_genero = p.genero
      LEFT JOIN catalogos.parroquias par ON par.id_parroquia = p.parroquia
      LEFT JOIN catalogos.municipios m ON m.id_municipio = par.municipio
      LEFT JOIN catalogos.estados e ON e.id_estados = m.estado
      LEFT JOIN operacional.fotos_perfil fp ON fp.persona_id = u.id_usuario
      ORDER BY p.email
    `);
        return usuarios.map((usuario) => this.mapUsuario(usuario));
    }
    async findOne(id, requester) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.mapUsuario(usuario);
    }
    isValidGmail(email) {
        if (!email || typeof email !== 'string')
            return false;
        return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
    }
    validatePhoneInput(phone) {
        if (!phone || !phone.trim())
            return null;
        const trimmed = phone.trim();
        const digitsOnly = trimmed.replace(/[\s\-()+]/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
            throw new common_1.BadRequestException('El número telefónico debe contener entre 7 y 15 dígitos (ejemplo: 04141234567)');
        }
        return trimmed;
    }
    async create(createUsuarioDto) {
        if (createUsuarioDto.numero_telefono) {
            this.validatePhoneInput(createUsuarioDto.numero_telefono);
        }
        const emailValue = createUsuarioDto.email.trim().toLowerCase();
        if (!this.isValidGmail(emailValue)) {
            throw new common_1.BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
        }
        const existingUser = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailValue}) LIMIT 1
    `);
        if (existingUser[0]) {
            throw new common_1.ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
        }
        const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);
        const roleId = await this.resolveRoleId(this.normalizeRoleValue(createUsuarioDto.rol || 'encuestador'));
        let tipoCedula;
        let cedula;
        if (createUsuarioDto.cedula) {
            const normalizedCedula = (0, cedula_code_util_1.normalizeCedulaInput)(createUsuarioDto.cedula);
            if (!this.isValidUsuarioCedula(normalizedCedula)) {
                throw new common_1.BadRequestException('La cédula debe ser V-123456 (6-9 dígitos), E-123456 (6-9 dígitos) o NP como A123');
            }
            const parsedCedula = this.parseCedulaData(normalizedCedula);
            tipoCedula = parsedCedula.tipoCedula;
            cedula = parsedCedula.cedula;
        }
        else {
            tipoCedula = 'NP';
            cedula = await this.generateUniqueCedula();
        }
        const parroquiaId = await this.resolveParroquiaId({
            parroquiaId: createUsuarioDto.parroquia_id,
            municipioId: createUsuarioDto.municipio_id,
            estadoId: createUsuarioDto.estado_id,
        });
        const generoId = await this.resolveGeneroId(createUsuarioDto.genero);
        const consejoUuid = createUsuarioDto.consejo_id
            ? await this.resolveConsejoUuid(createUsuarioDto.consejo_id)
            : null;
        const sharedEntityId = (0, crypto_1.randomUUID)();
        const birthDate = createUsuarioDto.fecha_nacimiento ? this.normalizeDateInput(createUsuarioDto.fecha_nacimiento) : null;
        await this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw(client_1.Prisma.sql `
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
          CAST(${sharedEntityId} AS uuid),
          ${createUsuarioDto.nombre || ''},
          ${createUsuarioDto.apellido || ''},
          CAST(${tipoCedula} AS registros.tipo_cedula_enum),
          ${cedula},
          ${birthDate ?? new Date('1990-01-01T00:00:00.000Z')},
          ${parroquiaId},
          ${createUsuarioDto.direccion || ''},
          ${emailValue},
          ${createUsuarioDto.numero_telefono ?? null},
          ${generoId},
          CASE
            WHEN CAST(${consejoUuid ?? null} AS text) IS NULL THEN NULL
            ELSE CAST(${consejoUuid ?? null} AS uuid)
          END
        )
      `);
            await tx.$queryRaw(client_1.Prisma.sql `
        INSERT INTO seguridad.usuarios (
          id_usuario,
          password_hash,
          id_rol,
          creado_por
        ) VALUES (
          CAST(${sharedEntityId} AS uuid),
          ${hashedPassword},
          ${roleId},
          NULL
        )
      `);
        });
        return this.findUsuarioRow(sharedEntityId);
    }
    async update(id, updateUsuarioDto) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const data = { ...updateUsuarioDto };
        const currentUserId = usuario.id;
        if (data.password !== undefined) {
            if (typeof data.password !== 'string' || !data.password.trim()) {
                throw new common_1.BadRequestException('La contraseña no puede estar vacía');
            }
            data.password_hash = await bcrypt.hash(data.password, 10);
            delete data.password;
        }
        if (typeof data.activo === 'boolean') {
            const syncStatus = data.activo ? 'synced' : 'disabled';
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE seguridad.usuarios SET sync_status = ${syncStatus} WHERE id_usuario::text = ${String(currentUserId)}
      `);
            delete data.activo;
        }
        if (data.email) {
            const emailVal = data.email.trim().toLowerCase();
            if (!this.isValidGmail(emailVal)) {
                throw new common_1.BadRequestException('El correo electrónico debe pertenecer al dominio @gmail.com (ej. usuario@gmail.com)');
            }
            const existing = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_personas FROM registros.personas WHERE LOWER(email) = LOWER(${emailVal}) AND id_personas::text <> ${String(currentUserId)} LIMIT 1
      `);
            if (existing[0]) {
                throw new common_1.ConflictException('El correo electrónico ya se encuentra registrado en el sistema. Por favor utiliza un correo diferente.');
            }
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE registros.personas SET email = ${emailVal} WHERE id_personas::text = ${String(currentUserId)}
      `);
            delete data.email;
        }
        if (data.numero_telefono != null) {
            this.validatePhoneInput(data.numero_telefono);
        }
        if (data.password_hash !== undefined) {
            const passwordHashValue = typeof data.password_hash === 'string' ? data.password_hash.trim() : '';
            if (!passwordHashValue) {
                throw new common_1.BadRequestException('El hash de la contraseña no puede estar vacío');
            }
            const normalizedHash = passwordHashValue.startsWith('$2')
                ? passwordHashValue
                : await bcrypt.hash(passwordHashValue, 10);
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE seguridad.usuarios SET password_hash = ${normalizedHash} WHERE id_usuario::text = ${String(currentUserId)}
      `);
            delete data.password_hash;
        }
        if (data.rol) {
            const roleId = await this.resolveRoleId(this.normalizeRoleValue(data.rol));
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE seguridad.usuarios SET id_rol = ${roleId} WHERE id_usuario::text = ${String(currentUserId)}
      `);
            delete data.rol;
        }
        const hasPersonaChanges = (data.nombre != null ||
            data.apellido != null ||
            data.direccion != null ||
            data.numero_telefono != null ||
            data.fecha_nacimiento != null ||
            data.consejo_id != null ||
            data.genero != null ||
            data.parroquia_id != null ||
            data.municipio_id != null ||
            data.estado_id != null);
        if (hasPersonaChanges) {
            const normalizedBirthDate = data.fecha_nacimiento != null
                ? (this.normalizeDateInput(data.fecha_nacimiento) ?? null)
                : null;
            const normalizedConsejoId = data.consejo_id != null
                ? await this.resolveConsejoUuid(data.consejo_id)
                : null;
            const parroquiaId = (data.parroquia_id != null || data.municipio_id != null || data.estado_id != null)
                ? await this.resolveParroquiaId({
                    parroquiaId: data.parroquia_id,
                    municipioId: data.municipio_id,
                    estadoId: data.estado_id,
                })
                : null;
            const generoId = data.genero != null
                ? await this.resolveGeneroId(data.genero)
                : null;
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE registros.personas
        SET
          nombre = COALESCE(${data.nombre ?? null}, nombre),
          apellido = COALESCE(${data.apellido ?? null}, apellido),
          direccion_usuario = COALESCE(${data.direccion ?? null}, direccion_usuario),
          numero_telefonico = COALESCE(${data.numero_telefono ?? null}, numero_telefonico),
          fecha_nacimiento = COALESCE(CAST(${normalizedBirthDate ?? null} AS date), fecha_nacimiento),
          parroquia = COALESCE(CAST(${parroquiaId ?? null} AS integer), parroquia),
          genero = COALESCE(CAST(${generoId ?? null} AS integer), genero),
          consejo_id = CASE
            WHEN CAST(${normalizedConsejoId ?? null} AS text) IS NULL THEN consejo_id
            ELSE CAST(${normalizedConsejoId ?? null} AS uuid)
          END,
          update_at = NOW()
        WHERE id_personas::text = ${String(currentUserId)}
      `);
        }
        const updatedUser = await this.findUsuarioRow(id);
        if (updatedUser) {
            void this.recordAuditLog({
                tablaNombre: 'usuarios',
                registroId: String(updatedUser.id),
                accion: 'UPDATE',
                valoresAnteriores: { nombre: usuario.nombre, apellido: usuario.apellido },
                valoresNuevos: data,
            });
        }
        return updatedUser;
    }
    async generateUniqueCedula() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = this.randomNoCedulaCode();
            const existing = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT cedula FROM registros.personas WHERE cedula = ${candidate} LIMIT 1
      `);
            if (!existing[0]) {
                return candidate;
            }
        }
        throw new common_1.ConflictException('No se pudo generar un código NP único, intente nuevamente');
    }
    async remove(id) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const userUuid = String(usuario.id);
        const fallbackAdmin = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT id_usuario FROM seguridad.usuarios
      WHERE id_usuario::text <> ${userUuid} AND id_rol = 1
      LIMIT 1
    `);
        const fallbackAdminId = fallbackAdmin[0]?.id_usuario ?? null;
        if (fallbackAdminId) {
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE operacional.formularios SET creado_por = CAST(${fallbackAdminId} AS uuid) WHERE creado_por::text = ${userUuid}
      `);
        }
        if (fallbackAdminId) {
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        UPDATE operacional.campesinos SET creado_por = CAST(${fallbackAdminId} AS uuid) WHERE creado_por::text = ${userUuid}
      `);
        }
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      UPDATE operacional.campesinos SET asignado_a = NULL WHERE asignado_a::text = ${userUuid}
    `);
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      UPDATE operacional.consejos SET encargado_id = NULL WHERE encargado_id::text = ${userUuid}
    `);
        try {
            await this.prisma.$queryRaw(client_1.Prisma.sql `
        DELETE FROM operacional.fotos_perfil WHERE persona_id::text = ${userUuid}
      `);
        }
        catch {
        }
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      DELETE FROM seguridad.usuarios WHERE id_usuario::text = ${userUuid}
    `);
        await this.prisma.$queryRaw(client_1.Prisma.sql `
      DELETE FROM registros.personas WHERE id_personas::text = ${userUuid}
    `);
        void this.recordAuditLog({
            tablaNombre: 'usuarios',
            registroId: userUuid,
            accion: 'DELETE',
            valoresAnteriores: { nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email },
        });
        return { deleted: true };
    }
    async saveProfileImage(id, dto) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const storageId = await this.storageService.saveUsuarioPerfilImagen({
            usuarioId: usuario.id,
            contentType: dto.content_type,
            fileName: dto.file_name,
            sizeBytes: dto.size_bytes,
            imageBase64: dto.image_base64,
            imageUrl: dto.image_url,
            metadata: dto.metadata,
        });
        return {
            usuario_id: usuario.id,
            postgres_habilitado: this.storageService.isEnabled(),
            guardado_en_postgres: Boolean(storageId),
            registro_id: storageId,
        };
    }
    async getProfileImage(id) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const image = await this.storageService.getUsuarioPerfilImagen(usuario.id);
        return {
            usuario_id: usuario.id,
            postgres_habilitado: this.storageService.isEnabled(),
            imagen: image,
        };
    }
    async deleteProfileImage(id) {
        const usuario = await this.findUsuarioRow(id);
        if (!usuario) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const deleted = await this.storageService.deleteUsuarioPerfilImagen(usuario.id);
        return {
            usuario_id: usuario.id,
            postgres_habilitado: this.storageService.isEnabled(),
            eliminado: deleted,
        };
    }
};
exports.UsuariosService = UsuariosService;
exports.UsuariosService = UsuariosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        postgres_storage_service_1.PostgresStorageService])
], UsuariosService);
//# sourceMappingURL=usuarios.service.js.map