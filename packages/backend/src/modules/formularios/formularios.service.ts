import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { SubmitFormularioRespuestaDto } from './dto/submit-formulario-respuesta.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';

@Injectable()
export class FormulariosService {
  constructor(
    private prisma: PrismaService,
    private mongoOptionalService: MongoOptionalService,
  ) {}

  async findAll() {
    return this.prisma.formulario.findMany({
      where: { activo: true },
    });
  }

  async findOne(id: number) {
    const formulario = await this.prisma.formulario.findUnique({
      where: { id },
    });

    if (!formulario) {
      throw new NotFoundException('Formulario no encontrado');
    }

    return formulario;
  }

  async create(createFormularioDto: CreateFormularioDto) {
    return this.prisma.formulario.create({
      data: {
        ...createFormularioDto,
        activo: createFormularioDto.activo ?? true,
      },
    });
  }

  async update(id: number, updateFormularioDto: UpdateFormularioDto) {
    const formulario = await this.prisma.formulario.findUnique({
      where: { id },
    });

    if (!formulario) {
      throw new NotFoundException('Formulario no encontrado');
    }

    return this.prisma.formulario.update({
      where: { id },
      data: updateFormularioDto,
    });
  }

  async remove(id: number) {
    const formulario = await this.prisma.formulario.findUnique({
      where: { id },
    });

    if (!formulario) {
      throw new NotFoundException('Formulario no encontrado');
    }

    return this.prisma.formulario.delete({ where: { id } });
  }

  async submitRespuesta(formularioId: number, dto: SubmitFormularioRespuestaDto) {
    if (!this.mongoOptionalService.isEnabled()) {
      throw new ServiceUnavailableException(
        'MongoDB no esta disponible. Las respuestas de formularios se guardan en MongoDB.',
      );
    }

    const formulario = await this.prisma.formulario.findUnique({
      where: { id: formularioId },
      select: { id: true },
    });

    if (!formulario) {
      throw new NotFoundException('Formulario no encontrado');
    }

    const mongoId = await this.mongoOptionalService.saveFormularioRespuesta({
      formularioId,
      campesinoId: dto.campesino_id,
      encuestadorId: dto.encuestador_id,
      respuestas: dto.respuestas,
      metadata: dto.metadata,
      capturadoEn: dto.capturado_en ? new Date(dto.capturado_en) : undefined,
    });

    if (!mongoId) {
      throw new ServiceUnavailableException(
        'No se pudo persistir la respuesta en MongoDB. Intenta nuevamente.',
      );
    }

    if (dto.campesino_id != null) {
      const camper = await this.prisma.campesino.findUnique({
        where: { id: dto.campesino_id },
        select: { id: true, metadata: true },
      });

      if (camper) {
        const currentMetadata = !camper.metadata || Array.isArray(camper.metadata)
          ? {}
          : (camper.metadata as Record<string, unknown>);
        const rawCompleted = currentMetadata.formularios_respondidos;
        const completedIds = Array.isArray(rawCompleted)
          ? rawCompleted
              .map((item) => Number(item))
              .filter((item) => Number.isFinite(item) && item > 0)
          : [];

        const updatedIds = Array.from(new Set([...completedIds, formularioId]));
        const activeForms = await this.prisma.formulario.findMany({
          where: { activo: true },
          select: { id: true },
        });
        const activeFormIds = activeForms.map((item) => item.id);
        const tienePendientes = activeFormIds.some((id) => !updatedIds.includes(id));

        await this.prisma.campesino.update({
          where: { id: dto.campesino_id },
          data: {
            metadata: {
              ...currentMetadata,
              formularios_respondidos: updatedIds,
              ultima_actualizacion_formularios: new Date().toISOString(),
            },
            tiene_pendientes: tienePendientes,
          },
        });
      }
    }

    return {
      formulario_id: formularioId,
      guardado_en_mongo: true,
      mongo_id: mongoId,
    };
  }
}