import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.sincronizacion.findMany({
        orderBy: { creado_en: 'desc' },
        take: 100,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        // Si la tabla de sincronizacion aun no existe, evitamos romper la UI y devolvemos lista vacia.
        return [];
      }
      throw error;
    }
  }

  async create(createSyncDto: CreateSyncDto) {
    return this.prisma.sincronizacion.create({ data: createSyncDto });
  }

  async update(id: number, updateSyncDto: UpdateSyncDto) {
    const sync = await this.prisma.sincronizacion.findUnique({
      where: { id },
    });

    if (!sync) {
      throw new NotFoundException('Registro de sincronización no encontrado');
    }

    return this.prisma.sincronizacion.update({
      where: { id },
      data: updateSyncDto,
    });
  }

  async process(id: number) {
    const sync = await this.prisma.sincronizacion.findUnique({ where: { id } });

    if (!sync) {
      throw new NotFoundException('Registro de sincronización no encontrado');
    }

    // Aquí implementarías la lógica de procesamiento
    // Por ejemplo: enviar a MongoDB, Redis queue, etc.

    return this.prisma.sincronizacion.update({
      where: { id },
      data: {
        estado: 'PROCESADO',
        procesado_en: new Date(),
      },
    });
  }
}