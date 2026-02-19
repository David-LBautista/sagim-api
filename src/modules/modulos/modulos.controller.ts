import { Controller, Post, Get, Patch, Param, Body } from '@nestjs/common';
import { ModulosService } from './modulos.service';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { UserRole } from '@/shared/enums';

@Controller('modulos')
export class ModulosController {
  constructor(private readonly modulosService: ModulosService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createModuloDto: CreateModuloDto) {
    return this.modulosService.create(createModuloDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  async findAll(@CurrentUser() user: any) {
    return this.modulosService.findAll(user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async updateEstado(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.modulosService.updateEstadoById(id, activo);
  }
}
