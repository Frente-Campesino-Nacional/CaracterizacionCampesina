import { BadRequestException, Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateCampesinDto } from './dto/create-campesino.dto';
import { UpdateCampesinDto } from './dto/update-campesino.dto';
import { SaveCampesinoProfileImageDto } from './dto/save-profile-image.dto';
import { generateRandomCedulaCode, isValidCedulaCode, normalizeCedulaInput } from '../../common/utils/cedula-code.util';

@Injectable()
export class CampesinosService {
  constructor(
    private prisma: PrismaService,
    private mongoOptionalService: MongoOptionalService,
  ) {}

  private normalizeCatalogValue(value?: string | null): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private mapCampesino(campesino: {
    id: number;
    cedula: string;
    nombre: string;
    apellido: string | null;
    telefono: string | null;
    correo: string | null;
    fecha_nacimiento: Date | null;
    genero: { tipo_gen: string } | null;
    consejo: { nombre: string } | null;
    estado: string | null;
    municipio: string | null;
    direccion: string | null;
    consejo_id: number | null;
    creado_por: number | null;
    asignado_a: number | null;
    tiene_pendientes: boolean;
    metadata: Prisma.JsonValue | null;
    creado_en: Date;
    actualizado_en: Date;
  }) {
    const { genero, ...rest } = campesino;

    return {
      ...rest,
      consejo_nombre: campesino.consejo?.nombre || null,
      genero: genero?.tipo_gen || null,
    };
  }

  private async registerSyncRecord(
    entidadId: number,
    operacion: 'CREATE' | 'UPDATE' | 'DELETE',
    datos: Record<string, unknown>,
  ) {
    try {
      await this.prisma.sincronizacion.create({
        data: {
          entidad: 'campesino',
          entidad_id: entidadId,
          operacion,
          datos: datos as Prisma.InputJsonValue,
          estado: 'PENDIENTE',
          intentos: 0,
        },
      });
    } catch {
      // No bloqueamos la operacion principal si falla el registro de auditoria.
    }
  }

  private normalizeOptionalForeignKey(value?: number | null) {
    if (value == null) {
      return undefined;
    }

    const normalized = typeof value === 'string' ? Number(value) : value;

    if (!Number.isInteger(normalized) || normalized <= 0) {
      return undefined;
    }

    return normalized;
  }

  private async validateForeignKeys(data: {
    consejo_id?: number;
    creado_por?: number;
    asignado_a?: number;
  }) {
    if (data.consejo_id != null) {
      const consejo = await this.prisma.consejo.findUnique({
        where: { id: data.consejo_id },
        select: { id: true },
      });
      if (!consejo) {
        throw new BadRequestException(`consejo_id ${data.consejo_id} no existe`);
      }
    }

    if (data.creado_por != null) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: data.creado_por },
        select: { id: true },
      });
      if (!usuario) {
        throw new BadRequestException(`creado_por ${data.creado_por} no existe`);
      }
    }

    if (data.asignado_a != null) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { id: data.asignado_a },
        select: { id: true },
      });
      if (!usuario) {
        throw new BadRequestException(`asignado_a ${data.asignado_a} no existe`);
      }
    }
  }

  private normalizeDateInput(value?: string) {
    if (!value) {
      return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00.000Z`);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  async findAll(requester: { id: number; rol: string }, consejoId?: number) {
    if (requester.rol === 'encuestador') {
      const currentUser = await this.prisma.usuario.findUnique({
        where: { id: requester.id },
        select: { consejo_id: true },
      });

      if (!currentUser?.consejo_id) {
        throw new ForbiddenException('El encuestador no tiene un consejo asignado');
      }

      return this.prisma.campesino.findMany({
        where: { consejo_id: currentUser.consejo_id },
        include: { consejo: true, genero: true },
      }).then((campesinos) => campesinos.map((campesino) => this.mapCampesino(campesino as any)));
    }

    return this.prisma.campesino.findMany({
      where: consejoId ? { consejo_id: consejoId } : undefined,
      include: { consejo: true, genero: true },
    }).then((campesinos) => campesinos.map((campesino) => this.mapCampesino(campesino as any)));
  }

  async findOne(id: number, requester: { id: number; rol: string }) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
      include: { consejo: true, genero: true },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    if (requester.rol === 'encuestador') {
      const currentUser = await this.prisma.usuario.findUnique({
        where: { id: requester.id },
        select: { consejo_id: true },
      });

      if (!currentUser?.consejo_id || currentUser.consejo_id !== campesino.consejo_id) {
        throw new ForbiddenException('No tiene permiso para ver este campesino');
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

    return this.mapCampesino(campesino as any);
  }

  async create(createCampesinDto: CreateCampesinDto) {
    const data: any = { ...createCampesinDto };

    let cedula = createCampesinDto.cedula ? normalizeCedulaInput(createCampesinDto.cedula) : '';
    if (!cedula) {
      cedula = await this.generateUniqueCedula();
    } else {
      if (!isValidCedulaCode(cedula)) {
        throw new BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
      }
      const existingCédula = await this.prisma.campesino.findUnique({ where: { cedula } });
      if (existingCédula) {
        throw new ConflictException('La cédula ya está registrada');
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
    } else {
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

    return this.mapCampesino(created as any);
  }

  async update(id: number, updateCampesinDto: UpdateCampesinDto) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const data: any = { ...updateCampesinDto };

    if ('consejo_id' in data) {
      const consejoId = this.normalizeOptionalForeignKey(data.consejo_id as number | null);
      data.consejo = consejoId ? { connect: { id: consejoId } } : { disconnect: true };
      delete data.consejo_id;
    }
    if ('creado_por' in data) {
      const creadoPorId = this.normalizeOptionalForeignKey(data.creado_por as number | null);
      data.creadoPor = creadoPorId ? { connect: { id: creadoPorId } } : { disconnect: true };
      delete data.creado_por;
    }
    if ('asignado_a' in data) {
      const asignadoAId = this.normalizeOptionalForeignKey(data.asignado_a as number | null);
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
      } else {
        data.genero = { disconnect: true };
      }
    }

    if ('cedula' in data) {
      const cedulaValue = data.cedula ? normalizeCedulaInput(data.cedula as string) : '';
      if (!cedulaValue) {
        throw new BadRequestException('La cédula no puede estar vacía');
      }
      if (!isValidCedulaCode(cedulaValue)) {
        throw new BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
      }
      const existingCédula = await this.prisma.campesino.findUnique({ where: { cedula: cedulaValue } });
      if (existingCédula && existingCédula.id !== id) {
        throw new ConflictException('La cédula ya está registrada');
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

    return this.mapCampesino(updated as any);
  }

  private async generateUniqueCedula(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateRandomCedulaCode();
      const existing = await this.prisma.campesino.findUnique({ where: { cedula: candidate } });
      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('No se pudo generar un código de cédula único, intente nuevamente');
  }

  async remove(id: number) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
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

  async saveProfileImage(id: number, dto: SaveCampesinoProfileImageDto) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
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

  async getProfileImage(id: number) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const image = await this.mongoOptionalService.getCampesinoPerfilImagen(id);

    return {
      campesino_id: id,
      mongo_habilitado: this.mongoOptionalService.isEnabled(),
      imagen: image,
    };
  }

  async deleteProfileImage(id: number) {
    const campesino = await this.prisma.campesino.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campesino) {
      throw new NotFoundException('Campesino no encontrado');
    }

    const deleted = await this.mongoOptionalService.deleteCampesinoPerfilImagen(id);

    return {
      campesino_id: id,
      mongo_habilitado: this.mongoOptionalService.isEnabled(),
      eliminado: deleted,
    };
  }
}