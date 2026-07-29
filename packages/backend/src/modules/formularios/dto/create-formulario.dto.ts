import { IsNotEmpty, IsOptional, IsInt, IsBoolean, IsObject, IsDateString } from 'class-validator';

export class CreateFormularioDto {
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsNotEmpty()
  @IsObject()
  estructura: object;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsNotEmpty()
  creado_por: string | number;

}
