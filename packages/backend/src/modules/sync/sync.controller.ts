import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';

@ApiTags('Sincronización')
@Controller('sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de sincronización' })
  findAll() {
    return this.syncService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear registro de sincronización' })
  create(@Body() createSyncDto: CreateSyncDto) {
    return this.syncService.create(createSyncDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar registro de sincronización' })
  update(@Param('id') id: string, @Body() updateSyncDto: UpdateSyncDto) {
    return this.syncService.update(id, updateSyncDto);
  }

  @Post('process/:id')
  @ApiOperation({ summary: 'Procesar un registro de sincronización' })
  process(@Param('id') id: string) {
    return this.syncService.process(id);
  }
}