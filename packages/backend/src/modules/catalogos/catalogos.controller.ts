import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';

@ApiTags('Catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('ubicacion')
  @ApiOperation({ summary: 'Obtener estados, municipios y parroquias' })
  getUbicacionCatalogos() {
    return this.catalogosService.getUbicacionCatalogos();
  }
}
