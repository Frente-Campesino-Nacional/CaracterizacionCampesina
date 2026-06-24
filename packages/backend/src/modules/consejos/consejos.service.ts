import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateConsejoDto } from './dto/create-consejo.dto';
import { UpdateConsejoDto } from './dto/update-consejo.dto';

@Injectable()
export class ConsejosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.consejo.findMany({
      include: { campesinos: true },
    });
  }

  async findOne(id: number) {
    const consejo = await this.prisma.consejo.findUnique({
      where: { id },
      include: { campesinos: true },
    });

    if (!consejo) {
      throw new NotFoundException('Consejo no encontrado');
    }

    return consejo;
  }

  async create(createConsejoDto: CreateConsejoDto) {
    // Verificar que el nombre sea único
    const existingConsejo = await this.prisma.consejo.findUnique({
      where: { nombre: createConsejoDto.nombre },
    });

    if (existingConsejo) {
      throw new ConflictException('Ya existe un consejo con ese nombre');
    }

    const data: any = { ...createConsejoDto };
    return this.prisma.consejo.create({
      data,
      include: { campesinos: true },
    });
  }

  async update(id: number, updateConsejoDto: UpdateConsejoDto) {
    const consejo = await this.prisma.consejo.findUnique({
      where: { id },
    });

    if (!consejo) {
      throw new NotFoundException('Consejo no encontrado');
    }

    // Si se intenta cambiar el nombre, verificar que no exista otro
    if (updateConsejoDto.nombre && updateConsejoDto.nombre !== consejo.nombre) {
      const existingConsejo = await this.prisma.consejo.findUnique({
        where: { nombre: updateConsejoDto.nombre },
      });

      if (existingConsejo) {
        throw new ConflictException('Ya existe un consejo con ese nombre');
      }
    }

    return this.prisma.consejo.update({
      where: { id },
      data: updateConsejoDto,
      include: { campesinos: true },
    });
  }

  async remove(id: number) {
    const consejo = await this.prisma.consejo.findUnique({
      where: { id },
    });

    if (!consejo) {
      throw new NotFoundException('Consejo no encontrado');
    }

    return this.prisma.consejo.delete({ where: { id } });
  }
}