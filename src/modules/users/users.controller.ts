import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  CurrentUser,
  MunicipalityId,
} from '@/common/decorators/user.decorator';
import { UserRole } from '@/shared/enums';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    const newUser = await this.usersService.create(createUserDto, req.user);
    const { password, refreshToken, ...result } = newUser.toObject();
    return result;
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Listar usuarios según rol' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  async findAll(@Req() req: any) {
    const { rol, municipioId } = req.user;

    // SUPER_ADMIN ve todos los usuarios
    if (rol === UserRole.SUPER_ADMIN) {
      return this.usersService.findAll();
    }

    // ADMIN_MUNICIPIO solo ve usuarios de su municipio
    if (rol === UserRole.ADMIN_MUNICIPIO) {
      return this.usersService.findByMunicipio(municipioId);
    }

    throw new Error('Rol no autorizado');
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiResponse({ status: 204, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }
}
