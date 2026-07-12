import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CallService } from './calls.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CallController {
  constructor(private readonly Service: CallService) {}

  @Get()
  findAll() {
    return this.Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.Service.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.Service.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.Service.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.Service.remove(id);
  }
}
