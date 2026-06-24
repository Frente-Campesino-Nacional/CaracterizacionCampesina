import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, createConnection } from 'mongoose';

type JsonMap = Record<string, unknown>;

interface FormularioRespuestaMongoInput {
  formularioId: number;
  campesinoId?: number;
  encuestadorId?: number;
  respuestas: JsonMap;
  metadata?: JsonMap;
  capturadoEn?: Date;
}

interface UsuarioPerfilImagenMongoInput {
  usuarioId: number;
  contentType: string;
  fileName?: string;
  sizeBytes?: number;
  imageBase64?: string;
  imageUrl?: string;
  metadata?: JsonMap;
}

interface CampesinoPerfilImagenMongoInput {
  campesinoId: number;
  contentType: string;
  fileName?: string;
  sizeBytes?: number;
  imageBase64?: string;
  imageUrl?: string;
  metadata?: JsonMap;
}

interface UsuarioPerfilImagenMongoDocument {
  _id: { toString(): string };
  usuario_id: number;
  content_type: string;
  file_name?: string;
  size_bytes?: number;
  image_base64?: string;
  image_url?: string;
  metadata?: JsonMap;
  creado_en: Date;
  actualizado_en: Date;
}

interface CampesinoPerfilImagenMongoDocument {
  _id: { toString(): string };
  campesino_id: number;
  content_type: string;
  file_name?: string;
  size_bytes?: number;
  image_base64?: string;
  image_url?: string;
  metadata?: JsonMap;
  creado_en: Date;
  actualizado_en: Date;
}

@Injectable()
export class MongoOptionalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoOptionalService.name);
  private connection: Connection | null = null;
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const optionalEnabled = this.configService.get<boolean>('mongodb.optionalEnabled');
    if (!optionalEnabled) {
      this.logger.log('Mongo opcional deshabilitado (MONGODB_OPTIONAL_ENABLED=false).');
      return;
    }

    const uri = this.configService.get<string>('mongodb.uri');
    if (!uri) {
      this.logger.warn('Mongo opcional habilitado pero MONGODB_URI no esta configurado.');
      return;
    }

    const dbName = this.configService.get<string>('mongodb.dbName') || undefined;

    try {
      this.connection = await createConnection(uri, {
        dbName,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
      }).asPromise();
      this.enabled = true;
      this.logger.log('Mongo opcional conectado correctamente.');
    } catch (error) {
      this.enabled = false;
      this.connection = null;
      this.logger.warn(`Mongo opcional no disponible: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.connection?.readyState === 1;
  }

  async saveFormularioRespuesta(input: FormularioRespuestaMongoInput): Promise<string | null> {
    if (!this.isEnabled() || !this.connection) {
      return null;
    }

    const now = new Date();
    const result = await this.connection.collection('form_responses').insertOne({
      formulario_id: input.formularioId,
      campesino_id: input.campesinoId,
      encuestador_id: input.encuestadorId,
      respuestas: input.respuestas,
      metadata: input.metadata ?? {},
      capturado_en: input.capturadoEn ?? now,
      creado_en: now,
      actualizado_en: now,
    });

    return result.insertedId.toString();
  }

  async saveUsuarioPerfilImagen(input: UsuarioPerfilImagenMongoInput): Promise<string | null> {
    if (!this.isEnabled() || !this.connection) {
      return null;
    }

    const now = new Date();
    await this.connection.collection('usuario_perfil_imagenes').updateOne(
      { usuario_id: input.usuarioId },
      {
        $set: {
          content_type: input.contentType,
          file_name: input.fileName,
          size_bytes: input.sizeBytes,
          image_base64: input.imageBase64,
          image_url: input.imageUrl,
          metadata: input.metadata ?? {},
          actualizado_en: now,
        },
        $setOnInsert: {
          usuario_id: input.usuarioId,
          creado_en: now,
        },
      },
      {
        upsert: true,
      },
    );

    const document = await this.connection.collection('usuario_perfil_imagenes').findOne(
      { usuario_id: input.usuarioId },
      { sort: { actualizado_en: -1, creado_en: -1 } },
    ) as unknown as UsuarioPerfilImagenMongoDocument | null;

    return document?._id?.toString() || null;
  }

  async getUsuarioPerfilImagen(usuarioId: number): Promise<Record<string, unknown> | null> {
    if (!this.isEnabled() || !this.connection) {
      return null;
    }

    const document = await this.connection.collection('usuario_perfil_imagenes').findOne(
      { usuario_id: usuarioId },
      { sort: { actualizado_en: -1, creado_en: -1 } },
    );

    return document || null;
  }

  async deleteUsuarioPerfilImagen(usuarioId: number): Promise<boolean> {
    if (!this.isEnabled() || !this.connection) {
      return false;
    }

    const result = await this.connection.collection('usuario_perfil_imagenes').deleteOne({
      usuario_id: usuarioId,
    });

    return result.deletedCount > 0;
  }

  async saveCampesinoPerfilImagen(input: CampesinoPerfilImagenMongoInput): Promise<string | null> {
    if (!this.isEnabled() || !this.connection) {
      return null;
    }

    const now = new Date();
    await this.connection.collection('campesino_perfil_imagenes').updateOne(
      { campesino_id: input.campesinoId },
      {
        $set: {
          content_type: input.contentType,
          file_name: input.fileName,
          size_bytes: input.sizeBytes,
          image_base64: input.imageBase64,
          image_url: input.imageUrl,
          metadata: input.metadata ?? {},
          actualizado_en: now,
        },
        $setOnInsert: {
          campesino_id: input.campesinoId,
          creado_en: now,
        },
      },
      { upsert: true },
    );

    const document = await this.connection.collection('campesino_perfil_imagenes').findOne(
      { campesino_id: input.campesinoId },
      { sort: { actualizado_en: -1, creado_en: -1 } },
    ) as unknown as CampesinoPerfilImagenMongoDocument | null;

    return document?._id?.toString() || null;
  }

  async getCampesinoPerfilImagen(campesinoId: number): Promise<Record<string, unknown> | null> {
    if (!this.isEnabled() || !this.connection) {
      return null;
    }

    const document = await this.connection.collection('campesino_perfil_imagenes').findOne(
      { campesino_id: campesinoId },
      { sort: { actualizado_en: -1, creado_en: -1 } },
    );

    return document || null;
  }

  async deleteCampesinoPerfilImagen(campesinoId: number): Promise<boolean> {
    if (!this.isEnabled() || !this.connection) {
      return false;
    }

    const result = await this.connection.collection('campesino_perfil_imagenes').deleteOne({
      campesino_id: campesinoId,
    });

    return result.deletedCount > 0;
  }
}
