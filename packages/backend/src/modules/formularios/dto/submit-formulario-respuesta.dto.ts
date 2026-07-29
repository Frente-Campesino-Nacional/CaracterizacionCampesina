import { IsDateString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class SubmitFormularioRespuestaDto {
  @IsOptional()
  campesino_id?: string | number;

  @IsOptional()
  encuestador_id?: string | number;

  @IsNotEmpty()
  @IsObject()
  respuestas: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  capturado_en?: string;
}
