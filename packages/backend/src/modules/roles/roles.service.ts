import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.rol.findMany({
      select: {
        id_rol: true,
        tipo_rol: true,
      },
      orderBy: {
        tipo_rol: 'asc',
      },
    });
  }
}