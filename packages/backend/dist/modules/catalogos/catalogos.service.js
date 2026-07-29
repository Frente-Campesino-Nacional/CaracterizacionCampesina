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
exports.CatalogosService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let CatalogosService = class CatalogosService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async loadUbicacionFromOperacional() {
        const [estados, municipios, parroquias] = await Promise.all([
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_estados, nombre_estado
        FROM operacional.estados
        ORDER BY nombre_estado ASC
      `),
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_municipio, estado, nombre_municipio
        FROM operacional.municipios
        ORDER BY nombre_municipio ASC
      `),
            this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT id_parroquia, municipio, nombre_parroquia
        FROM operacional.parroquias
        ORDER BY nombre_parroquia ASC
      `),
        ]);
        return { estados, municipios, parroquias };
    }
    async loadUbicacionFromCatalogos() {
        const [estados, municipios, parroquias] = await Promise.all([
            this.prisma.estado.findMany({
                select: {
                    id_estados: true,
                    nombre_estado: true,
                },
                orderBy: { nombre_estado: 'asc' },
            }),
            this.prisma.municipio.findMany({
                select: {
                    id_municipio: true,
                    estado: true,
                    nombre_municipio: true,
                },
                orderBy: { nombre_municipio: 'asc' },
            }),
            this.prisma.parroquia.findMany({
                select: {
                    id_parroquia: true,
                    nombre_parroquia: true,
                    municipio: true,
                },
                orderBy: { nombre_parroquia: 'asc' },
            }),
        ]);
        return { estados, municipios, parroquias };
    }
    async getUbicacionCatalogos() {
        let estados = [];
        let municipios = [];
        let parroquias = [];
        try {
            ({ estados, municipios, parroquias } = await this.loadUbicacionFromOperacional());
        }
        catch {
            ({ estados, municipios, parroquias } = await this.loadUbicacionFromCatalogos());
        }
        return {
            estados: estados.map((estado) => ({
                id: estado.id_estados,
                nombre: estado.nombre_estado,
                municipios: municipios
                    .filter((municipio) => municipio.estado === estado.id_estados)
                    .map((municipio) => ({
                    id: municipio.id_municipio,
                    nombre: municipio.nombre_municipio,
                    parroquias: parroquias
                        .filter((parroquia) => parroquia.municipio === municipio.id_municipio)
                        .map((parroquia) => ({
                        id: parroquia.id_parroquia,
                        nombre: parroquia.nombre_parroquia,
                    })),
                })),
            })),
        };
    }
};
exports.CatalogosService = CatalogosService;
exports.CatalogosService = CatalogosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CatalogosService);
//# sourceMappingURL=catalogos.service.js.map