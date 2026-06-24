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
exports.CampesinosService = void 0;
const common_1 = require("@nestjs/common");
const mongo_optional_service_1 = require("../../database/mongo-optional.service");
const prisma_service_1 = require("../../database/prisma.service");
const cedula_code_util_1 = require("../../common/utils/cedula-code.util");
let CampesinosService = class CampesinosService {
    constructor(prisma, mongoOptionalService) {
        this.prisma = prisma;
        this.mongoOptionalService = mongoOptionalService;
    }
    normalizeCatalogValue(value) {
        const normalized = value?.trim();
        return normalized ? normalized : undefined;
    }
    mapCampesino(campesino) {
        const { genero, ...rest } = campesino;
        return {
            ...rest,
            consejo_nombre: campesino.consejo?.nombre || null,
            genero: genero?.tipo_gen || null,
        };
    }
    async registerSyncRecord(entidadId, operacion, datos) {
        try {
            await this.prisma.sincronizacion.create({
                data: {
                    entidad: 'campesino',
                    entidad_id: entidadId,
                    operacion,
                    datos: datos,
                    estado: 'PENDIENTE',
                    intentos: 0,
                },
            });
        }
        catch {
        }
    }
    normalizeOptionalForeignKey(value) {
        if (value == null) {
            return undefined;
        }
        const normalized = typeof value === 'string' ? Number(value) : value;
        if (!Number.isInteger(normalized) || normalized <= 0) {
            return undefined;
        }
        return normalized;
    }
    async validateForeignKeys(data) {
        if (data.consejo_id != null) {
            const consejo = await this.prisma.consejo.findUnique({
                where: { id: data.consejo_id },
                select: { id: true },
            });
            if (!consejo) {
                throw new common_1.BadRequestException(`consejo_id ${data.consejo_id} no existe`);
            }
        }
        if (data.creado_por != null) {
            const usuario = await this.prisma.usuario.findUnique({
                where: { id: data.creado_por },
                select: { id: true },
            });
            if (!usuario) {
                throw new common_1.BadRequestException(`creado_por ${data.creado_por} no existe`);
            }
        }
        if (data.asignado_a != null) {
            const usuario = await this.prisma.usuario.findUnique({
                where: { id: data.asignado_a },
                select: { id: true },
            });
            if (!usuario) {
                throw new common_1.BadRequestException(`asignado_a ${data.asignado_a} no existe`);
            }
        }
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
    async findAll(requester, consejoId) {
        if (requester.rol === 'encuestador') {
            const currentUser = await this.prisma.usuario.findUnique({
                where: { id: requester.id },
                select: { consejo_id: true },
            });
            if (!currentUser?.consejo_id) {
                throw new common_1.ForbiddenException('El encuestador no tiene un consejo asignado');
            }
            return this.prisma.campesino.findMany({
                where: { consejo_id: currentUser.consejo_id },
                include: { consejo: true, genero: true },
            }).then((campesinos) => campesinos.map((campesino) => this.mapCampesino(campesino)));
        }
        return this.prisma.campesino.findMany({
            where: consejoId ? { consejo_id: consejoId } : undefined,
            include: { consejo: true, genero: true },
        }).then((campesinos) => campesinos.map((campesino) => this.mapCampesino(campesino)));
    }
    async findOne(id, requester) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
            include: { consejo: true, genero: true },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        if (requester.rol === 'encuestador') {
            const currentUser = await this.prisma.usuario.findUnique({
                where: { id: requester.id },
                select: { consejo_id: true },
            });
            if (!currentUser?.consejo_id || currentUser.consejo_id !== campesino.consejo_id) {
                throw new common_1.ForbiddenException('No tiene permiso para ver este campesino');
            }
            return {
                cedula: campesino.cedula,
                nombre: campesino.nombre,
                apellido: campesino.apellido,
                telefono: campesino.telefono,
                correo: campesino.correo,
                fecha_nacimiento: campesino.fecha_nacimiento,
                genero: campesino.genero?.tipo_gen || null,
                estado: campesino.estado,
                municipio: campesino.municipio,
                direccion: campesino.direccion,
                consejo_id: campesino.consejo_id,
                consejo_nombre: campesino.consejo?.nombre || null,
                tiene_pendientes: campesino.tiene_pendientes,
                creado_en: campesino.creado_en,
                actualizado_en: campesino.actualizado_en,
            };
        }
        return this.mapCampesino(campesino);
    }
    async create(createCampesinDto) {
        const data = { ...createCampesinDto };
        let cedula = createCampesinDto.cedula ? (0, cedula_code_util_1.normalizeCedulaInput)(createCampesinDto.cedula) : '';
        if (!cedula) {
            cedula = await this.generateUniqueCedula();
        }
        else {
            if (!(0, cedula_code_util_1.isValidCedulaCode)(cedula)) {
                throw new common_1.BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
            }
            const existingCédula = await this.prisma.campesino.findUnique({ where: { cedula } });
            if (existingCédula) {
                throw new common_1.ConflictException('La cédula ya está registrada');
            }
        }
        data.cedula = cedula;
        data.consejo_id = this.normalizeOptionalForeignKey(data.consejo_id);
        data.creado_por = this.normalizeOptionalForeignKey(data.creado_por);
        data.asignado_a = this.normalizeOptionalForeignKey(data.asignado_a);
        if (typeof data.fecha_nacimiento === 'string') {
            data.fecha_nacimiento = this.normalizeDateInput(data.fecha_nacimiento);
        }
        const generoValue = this.normalizeCatalogValue(data.genero);
        if (generoValue) {
            data.genero = {
                connectOrCreate: {
                    where: { tipo_gen: generoValue },
                    create: { tipo_gen: generoValue },
                },
            };
        }
        else {
            delete data.genero;
        }
        if (data.consejo_id) {
            data.consejo = {
                connect: { id: data.consejo_id },
            };
        }
        if (data.creado_por) {
            data.creadoPor = {
                connect: { id: data.creado_por },
            };
        }
        if (data.asignado_a) {
            data.asignadoA = {
                connect: { id: data.asignado_a },
            };
        }
        delete data.consejo_id;
        delete data.creado_por;
        delete data.asignado_a;
        await this.validateForeignKeys(data);
        const created = await this.prisma.campesino.create({
            data,
            include: { consejo: true, genero: true },
        });
        await this.registerSyncRecord(created.id, 'CREATE', {
            cedula: created.cedula,
            nombre: created.nombre,
            telefono: created.telefono,
            correo: created.correo,
            estado: created.estado,
            municipio: created.municipio,
            consejo_id: created.consejo_id,
            creado_por: created.creado_por,
            asignado_a: created.asignado_a,
        });
        return this.mapCampesino(created);
    }
    async update(id, updateCampesinDto) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        const data = { ...updateCampesinDto };
        if ('consejo_id' in data) {
            const consejoId = this.normalizeOptionalForeignKey(data.consejo_id);
            data.consejo = consejoId ? { connect: { id: consejoId } } : { disconnect: true };
            delete data.consejo_id;
        }
        if ('creado_por' in data) {
            const creadoPorId = this.normalizeOptionalForeignKey(data.creado_por);
            data.creadoPor = creadoPorId ? { connect: { id: creadoPorId } } : { disconnect: true };
            delete data.creado_por;
        }
        if ('asignado_a' in data) {
            const asignadoAId = this.normalizeOptionalForeignKey(data.asignado_a);
            data.asignadoA = asignadoAId ? { connect: { id: asignadoAId } } : { disconnect: true };
            delete data.asignado_a;
        }
        if (typeof data.fecha_nacimiento === 'string') {
            data.fecha_nacimiento = this.normalizeDateInput(data.fecha_nacimiento);
        }
        if ('genero' in data) {
            const generoValue = this.normalizeCatalogValue(data.genero);
            if (generoValue) {
                data.genero = {
                    connectOrCreate: {
                        where: { tipo_gen: generoValue },
                        create: { tipo_gen: generoValue },
                    },
                };
            }
            else {
                data.genero = { disconnect: true };
            }
        }
        if ('cedula' in data) {
            const cedulaValue = data.cedula ? (0, cedula_code_util_1.normalizeCedulaInput)(data.cedula) : '';
            if (!cedulaValue) {
                throw new common_1.BadRequestException('La cédula no puede estar vacía');
            }
            if (!(0, cedula_code_util_1.isValidCedulaCode)(cedulaValue)) {
                throw new common_1.BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
            }
            const existingCédula = await this.prisma.campesino.findUnique({ where: { cedula: cedulaValue } });
            if (existingCédula && existingCédula.id !== id) {
                throw new common_1.ConflictException('La cédula ya está registrada');
            }
            data.cedula = cedulaValue;
        }
        await this.validateForeignKeys(data);
        const updated = await this.prisma.campesino.update({
            where: { id },
            data,
            include: { consejo: true, genero: true },
        });
        await this.registerSyncRecord(updated.id, 'UPDATE', {
            cedula: updated.cedula,
            nombre: updated.nombre,
            telefono: updated.telefono,
            correo: updated.correo,
            estado: updated.estado,
            municipio: updated.municipio,
            consejo_id: updated.consejo_id,
            creado_por: updated.creado_por,
            asignado_a: updated.asignado_a,
            tiene_pendientes: updated.tiene_pendientes,
        });
        return this.mapCampesino(updated);
    }
    async generateUniqueCedula() {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = (0, cedula_code_util_1.generateRandomCedulaCode)();
            const existing = await this.prisma.campesino.findUnique({ where: { cedula: candidate } });
            if (!existing) {
                return candidate;
            }
        }
        throw new common_1.ConflictException('No se pudo generar un código de cédula único, intente nuevamente');
    }
    async remove(id) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        const deleted = await this.prisma.campesino.delete({ where: { id } });
        await this.registerSyncRecord(deleted.id, 'DELETE', {
            cedula: deleted.cedula,
            nombre: deleted.nombre,
            telefono: deleted.telefono,
            correo: deleted.correo,
            estado: deleted.estado,
            municipio: deleted.municipio,
            consejo_id: deleted.consejo_id,
            creado_por: deleted.creado_por,
            asignado_a: deleted.asignado_a,
        });
        return deleted;
    }
    async saveProfileImage(id, dto) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        const mongoId = await this.mongoOptionalService.saveCampesinoPerfilImagen({
            campesinoId: id,
            contentType: dto.content_type,
            fileName: dto.file_name,
            sizeBytes: dto.size_bytes,
            imageBase64: dto.image_base64,
            imageUrl: dto.image_url,
            metadata: dto.metadata,
        });
        return {
            campesino_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            guardado_en_mongo: Boolean(mongoId),
            mongo_id: mongoId,
        };
    }
    async getProfileImage(id) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        const image = await this.mongoOptionalService.getCampesinoPerfilImagen(id);
        return {
            campesino_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            imagen: image,
        };
    }
    async deleteProfileImage(id) {
        const campesino = await this.prisma.campesino.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!campesino) {
            throw new common_1.NotFoundException('Campesino no encontrado');
        }
        const deleted = await this.mongoOptionalService.deleteCampesinoPerfilImagen(id);
        return {
            campesino_id: id,
            mongo_habilitado: this.mongoOptionalService.isEnabled(),
            eliminado: deleted,
        };
    }
};
exports.CampesinosService = CampesinosService;
exports.CampesinosService = CampesinosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mongo_optional_service_1.MongoOptionalService])
], CampesinosService);
//# sourceMappingURL=campesinos.service.js.map