import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadUbicacionFromOperacional() {
    const [estados, municipios] = await Promise.all([
      this.prisma.$queryRaw<Array<{ id_estados: number; nombre_estado: string }>>(Prisma.sql`
        SELECT id_estados, nombre_estado
        FROM catalogos.estados
        ORDER BY nombre_estado ASC
      `),
      this.prisma.$queryRaw<Array<{ id_municipio: number; estado: number; nombre_municipio: string }>>(Prisma.sql`
        SELECT id_municipio, estado, nombre_municipio
        FROM catalogos.municipios
        ORDER BY nombre_municipio ASC
      `),
    ]);

    return { estados, municipios, parroquias: [] };
  }

  private async loadUbicacionFromCatalogos() {
    const [estados, municipios] = await Promise.all([
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
    ]);

    return { estados, municipios, parroquias: [] };
  }

  async getUbicacionCatalogos() {
    let estados: Array<{ id_estados: number; nombre_estado: string }> = [];
    let municipios: Array<{ id_municipio: number; estado: number; nombre_municipio: string }> = [];

    try {
      ({ estados, municipios } = await this.loadUbicacionFromOperacional());
    } catch {
      ({ estados, municipios } = await this.loadUbicacionFromCatalogos());
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
            parroquias: [],
          })),
      })),
    };
  }
}
