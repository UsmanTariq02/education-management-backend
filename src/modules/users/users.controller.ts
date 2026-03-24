import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create user and assign roles' })
  async create(
    @Body() payload: CreateUserDto,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<UserResponseDto> {
    return this.usersService.create(payload, actor);
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'List users' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.usersService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get user by id' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<UserResponseDto> {
    return this.usersService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
    @CurrentUser() actor: CurrentUserContext,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Delete user' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.usersService.delete(id, actor);
    return { deleted: true };
  }
}
