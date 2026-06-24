import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GenerosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.genero.findMany({
      select: {
        id_gen: true,
        tipo_gen: true,
      },
      orderBy: {
        tipo_gen: 'asc',
      },
    });
  }
}