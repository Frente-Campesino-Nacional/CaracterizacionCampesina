import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { SaveProfileImageDto } from './dto/save-profile-image.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('Usuarios')
@Controller('usuarios')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos los usuarios' })
  findAll(@Request() req) {
    return this.usuariosService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.usuariosService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() updateUsuarioDto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }

  @Post(':id/foto-perfil')
  @ApiOperation({ summary: 'Guardar imagen de perfil' })
  saveProfileImage(
    @Param('id') id: string,
    @Body() saveProfileImageDto: SaveProfileImageDto,
  ) {
    return this.usuariosService.saveProfileImage(id, saveProfileImageDto);
  }

  @Get(':id/foto-perfil')
  @ApiOperation({ summary: 'Obtener imagen de perfil' })
  getProfileImage(@Param('id') id: string) {
    return this.usuariosService.getProfileImage(id);
  }

  @Put(':id/foto-perfil')
  @ApiOperation({ summary: 'Actualizar imagen de perfil' })
  updateProfileImage(
    @Param('id') id: string,
    @Body() saveProfileImageDto: SaveProfileImageDto,
  ) {
    return this.usuariosService.saveProfileImage(id, saveProfileImageDto);
  }

  @Delete(':id/foto-perfil')
  @ApiOperation({ summary: 'Eliminar imagen de perfil' })
  deleteProfileImage(@Param('id') id: string) {
    return this.usuariosService.deleteProfileImage(id);
  }
}