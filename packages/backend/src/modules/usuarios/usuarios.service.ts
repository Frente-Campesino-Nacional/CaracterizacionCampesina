import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MongoOptionalService } from '../../database/mongo-optional.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { generateRandomCedulaCode, isValidCedulaCode, normalizeCedulaInput } from '../../common/utils/cedula-code.util';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private mongoOptionalService: MongoOptionalService,
  ) {}

  private normalizeCatalogValue(value?: string | null): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private normalizeRoleValue(value?: string | null): string {
    const normalized = this.normalizeCatalogValue(value)?.toLowerCase();
    if (!normalized || normalized === 'admin' || normalized === 'administrador') {
      return 'administrador';
    }

    return normalized;
  }

  private mapUsuario(usuario: {
    id: number;
    cedula: string | null;
    email: string;
    nombre: string;
    apellido: string;
    rol: { tipo_rol: string };
    numero_telefono: string | null;
    fecha_nacimiento: Date | null;
    genero: { tipo_gen: string } | null;
    estado: string | null;
    municipio: string | null;
    direccion: string | null;
    consejo_id: number | null;
    consejo?: { nombre: string } | null;
    activo: boolean;
    creado_en: Date;
  }) {
    const { rol, genero, consejo, ...rest } = usuario;

    return {
      ...rest,
      rol: rol.tipo_rol,
      genero: genero?.tipo_gen || null,
      consejo_nombre: consejo?.nombre || null,
    };
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

  async findAll(requester: { rol: string }) {
    if (this.normalizeRoleValue(requester.rol) !== 'administrador') {
      throw new ForbiddenException('Solo administradores pueden listar usuarios');
    }

    const usuarios = await this.prisma.usuario.findMany({
      include: {
        rol: true,
        genero: true,
      },
    });

    return usuarios.map((usuario) => this.mapUsuario(usuario as any));
  }

  async findOne(id: number, requester: { rol: string }) {
    if (this.normalizeRoleValue(requester.rol) !== 'administrador') {
      throw new ForbiddenException('Solo administradores pueden ver perfiles de usuarios');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        rol: true,
        genero: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapUsuario(usuario as any);
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    let cedula = createUsuarioDto.cedula ? normalizeCedulaInput(createUsuarioDto.cedula) : '';
    if (!cedula) {
      cedula = await this.generateUniqueCedula();
    } else {
      if (!isValidCedulaCode(cedula)) {
        throw new BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
      }
      const existingCédula = await this.prisma.usuario.findUnique({ where: { cedula } });
      if (existingCédula) {
        throw new ConflictException('La cédula ya está registrada');
      }
    }

    const rolValue = this.normalizeRoleValue(createUsuarioDto.rol || 'encuestador');
    const generoValue = this.normalizeCatalogValue(createUsuarioDto.genero);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: createUsuarioDto.email,
        password_hash: hashedPassword,
        cedula,
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        rol: {
          connectOrCreate: {
            where: { tipo_rol: rolValue },
            create: { tipo_rol: rolValue },
          },
        },
        numero_telefono: createUsuarioDto.numero_telefono,
        fecha_nacimiento: this.normalizeDateInput(createUsuarioDto.fecha_nacimiento),
        genero: generoValue
          ? {
              connectOrCreate: {
                where: { tipo_gen: generoValue },
                create: { tipo_gen: generoValue },
              },
            }
          : undefined,
        estado: createUsuarioDto.estado,
        municipio: createUsuarioDto.municipio,
        direccion: createUsuarioDto.direccion,
        consejo: createUsuarioDto.consejo_id
          ? {
              connect: { id: Number(createUsuarioDto.consejo_id) },
            }
          : undefined,
        activo: createUsuarioDto.activo ?? true,
        creado_en: createUsuarioDto.creado_en ? new Date(createUsuarioDto.creado_en) : undefined,
      } as any,
      include: {
        rol: true,
        genero: true,
        consejo: true,
      },
    });

    return this.mapUsuario(usuario as any);
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email: updateUsuarioDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    const data: any = { ...updateUsuarioDto };
    if (data.password) {
      data.password_hash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    delete data.creado_en;
    delete data.actualizado_en;

    if (typeof data.fecha_nacimiento === 'string') {
      data.fecha_nacimiento = this.normalizeDateInput(data.fecha_nacimiento);
    }

    if ('cedula' in data) {
      const cedulaValue = data.cedula ? normalizeCedulaInput(data.cedula) : '';
      if (!cedulaValue) {
        throw new BadRequestException('La cédula no puede estar vacía');
      }
      if (!isValidCedulaCode(cedulaValue)) {
        throw new BadRequestException('La cédula debe ser V-12345678, E-12345678 o un número de 9 dígitos');
      }
      const existingCédula = await this.prisma.usuario.findUnique({ where: { cedula: cedulaValue } });
      if (existingCédula && existingCédula.id !== id) {
        throw new ConflictException('La cédula ya está registrada');
      }
      data.cedula = cedulaValue;
    }

    if ('rol' in data) {
      const rolValue = this.normalizeRoleValue(data.rol);
      if (rolValue) {
        data.rol = {
          connectOrCreate: {
            where: { tipo_rol: rolValue },
            create: { tipo_rol: rolValue },
          },
        };
      } else {
        delete data.rol;
      }
    }

    if ('consejo_id' in data) {
      const consejoId = data.consejo_id;
      if (consejoId === null || consejoId === undefined || consejoId === '') {
        data.consejo = { disconnect: true };
      } else {
        data.consejo = {
          connect: { id: Number(consejoId) },
        };
      }
      delete data.consejo_id;
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

    const updated = await this.prisma.usuario.update({
      where: { id },
      data,
      include: {
        rol: true,
        genero: true,
        consejo: true,
      },
    });

    return this.mapUsuario(updated as any);
  }

  private async generateUniqueCedula(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = generateRandomCedulaCode();
      const existing = await this.prisma.usuario.findUnique({ where: { cedula: candidate } });
      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('No se pudo generar un código de cédula único, intente nuevamente');
  }

  async remove(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.prisma.usuario.delete({
      where: { id },
    });
  }

  async saveProfileImage(id: number, dto: SaveProfileImageDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const mongoId = await this.mongoOptionalService.saveUsuarioPerfilImagen({
      usuarioId: id,
      contentType: dto.content_type,
      fileName: dto.file_name,
      sizeBytes: dto.size_bytes,
      imageBase64: dto.image_base64,
      imageUrl: dto.image_url,
      metadata: dto.metadata,
    });

    return {
      usuario_id: id,
      mongo_habilitado: this.mongoOptionalService.isEnabled(),
      guardado_en_mongo: Boolean(mongoId),
      mongo_id: mongoId,
    };
  }

  async getProfileImage(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const image = await this.mongoOptionalService.getUsuarioPerfilImagen(id);

    return {
      usuario_id: id,
      mongo_habilitado: this.mongoOptionalService.isEnabled(),
      imagen: image,
    };
  }

  async deleteProfileImage(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const deleted = await this.mongoOptionalService.deleteUsuarioPerfilImagen(id);

    return {
      usuario_id: id,
      mongo_habilitado: this.mongoOptionalService.isEnabled(),
      eliminado: deleted,
    };
  }
}