import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SaveProfileImageDto {
  @IsNotEmpty()
  @IsString()
  content_type: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsInt()
  size_bytes?: number;

  @IsOptional()
  @IsString()
  image_base64?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
