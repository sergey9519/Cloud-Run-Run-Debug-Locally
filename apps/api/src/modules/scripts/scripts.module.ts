
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScriptsService {
  constructor(private prisma: PrismaService) {}
  async findAll() { return this.prisma.script.findMany(); }
  async create(data: any) { return this.prisma.script.create({ data }); }
  async findByProject(projectId: string) { return this.prisma.script.findMany({ where: { projectId }}); }
}

@Controller('scripts')
export class ScriptsController {
  constructor(private service: ScriptsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: any) { return this.service.create(dto); }
  @Get('project/:projectId') findByProject(@Param('projectId') id: string) { return this.service.findByProject(id); }
}

@Module({
  imports: [PrismaModule],
  controllers: [ScriptsController],
  providers: [ScriptsService],
})
export class ScriptsModule {}
