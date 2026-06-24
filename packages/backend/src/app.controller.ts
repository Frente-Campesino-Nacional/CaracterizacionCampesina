import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Welcome message' })
  getHello() {
    return { message: 'Welcome to CensoCampesino API' };
  }
}