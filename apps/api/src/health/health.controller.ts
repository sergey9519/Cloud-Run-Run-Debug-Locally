
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    const uptime = (process as any).uptime();
    return {
      status: 'ok',
      uptime,
      timestamp: new Date().toISOString(),
      service: 'Studio Roster API',
      version: '2.4.0'
    };
  }
}
