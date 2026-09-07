import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GenerosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.$queryRaw<Array<{ id_sexo: number; id_genero: number; tipo_gen: string }>>(Prisma.sql`
      SELECT id_sexo, id_sexo AS id_genero, sexo AS tipo_gen
      FROM catalogos.generos
      ORDER BY id_sexo ASC
    `);
  }
}