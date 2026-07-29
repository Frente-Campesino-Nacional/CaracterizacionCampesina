import { IsOptional, IsBoolean, IsInt, IsObject, IsDateString } from 'class-validator';

export class UpdateFormularioDto {
  @IsOptional()
  titulo?: string;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsObject()
  estructura?: object;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  creado_por?: string | number;

}
