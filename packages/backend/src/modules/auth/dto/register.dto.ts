import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin@censo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsOptional()
  apellido?: string;

  @ApiProperty({ example: 'encuestador', required: false })
  @IsOptional()
  @IsEnum(['admin', 'administrador', 'encuestador'])
  rol?: 'admin' | 'administrador' | 'encuestador';
}