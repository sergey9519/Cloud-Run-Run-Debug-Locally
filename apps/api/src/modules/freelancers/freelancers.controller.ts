
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FreelancersService } from './freelancers.service';

@Controller('freelancers')
export class FreelancersController {
  constructor(private readonly freelancersService: FreelancersService) {}

  @Get()
  findAll() {
    return this.freelancersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.freelancersService.findOne(id);
  }

  @Post()
  create(@Body() createDto: any) {
    return this.freelancersService.create(createDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.freelancersService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.freelancersService.remove(id);
  }

  @Post('batch')
  importBatch(@Body() items: any[]) {
    return this.freelancersService.createBatch(items);
  }
}
