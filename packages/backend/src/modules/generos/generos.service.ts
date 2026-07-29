import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GenerosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.$queryRaw<Array<{ id_genero: number; tipo_gen: string }>>(Prisma.sql`
      SELECT id_genero, genero AS tipo_gen
      FROM catalogos.generos
      ORDER BY genero ASC
    `);
  }
}