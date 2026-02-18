import { Controller, Get, Version } from '@nestjs/common';
import { VERSION_NEUTRAL } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @Version(VERSION_NEUTRAL)
  ping() {
    return { status: 'OK' };
  }
}

