import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CampesinosService } from './campesinos.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCampesinDto } from './dto/create-campesino.dto';
import { UpdateCampesinDto } from './dto/update-campesino.dto';
import { SaveCampesinoProfileImageDto } from './dto/save-profile-image.dto';

@ApiTags('Campesinos')
@Controller('campesinos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampesinosController {
  constructor(private readonly campesinosService: CampesinosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar campesinos' })
  findAll(@Request() req, @Query('consejoId') consejoId?: number) {
    return this.campesinosService.findAll(req.user, consejoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener campesino por ID' })
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.campesinosService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo campesino' })
  create(@Body() createCampesinDto: CreateCampesinDto) {
    return this.campesinosService.create(createCampesinDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar campesino' })
  update(@Param('id') id: number, @Body() updateCampesinDto: UpdateCampesinDto) {
    return this.campesinosService.update(id, updateCampesinDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar campesino' })
  remove(@Param('id') id: number) {
    return this.campesinosService.remove(id);
  }

  @Post(':id/foto-perfil')
  @ApiOperation({ summary: 'Guardar imagen de perfil del campesino en Mongo opcional' })
  saveProfileImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() saveCampesinoProfileImageDto: SaveCampesinoProfileImageDto,
  ) {
    return this.campesinosService.saveProfileImage(id, saveCampesinoProfileImageDto);
  }

  @Get(':id/foto-perfil')
  @ApiOperation({ summary: 'Obtener imagen de perfil del campesino en Mongo opcional' })
  getProfileImage(@Param('id', ParseIntPipe) id: number) {
    return this.campesinosService.getProfileImage(id);
  }

  @Delete(':id/foto-perfil')
  @ApiOperation({ summary: 'Eliminar imagen de perfil del campesino en Mongo opcional' })
  deleteProfileImage(@Param('id', ParseIntPipe) id: number) {
    return this.campesinosService.deleteProfileImage(id);
  }
}