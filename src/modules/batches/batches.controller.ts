import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@ApiTags('Batches')
@ApiBearerAuth()
@Controller({ path: 'batches', version: '1' })
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @Permissions('batches.create')
  @ApiOperation({ summary: 'Create batch or class' })
  async create(@Body() payload: CreateBatchDto, @CurrentUser() actor: CurrentUserContext) {
    return this.batchesService.create(payload, actor);
  }

  @Get()
  @Permissions('batches.read')
  @ApiOperation({ summary: 'List batches' })
  async findAll(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.batchesService.findAll(query, actor);
  }

  @Get(':id')
  @Permissions('batches.read')
  @ApiOperation({ summary: 'Get batch details' })
  async findOne(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext) {
    return this.batchesService.findOne(id, actor);
  }

  @Patch(':id')
  @Permissions('batches.update')
  @ApiOperation({ summary: 'Update batch' })
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateBatchDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.batchesService.update(id, payload, actor);
  }

  @Delete(':id')
  @Permissions('batches.delete')
  @ApiOperation({ summary: 'Delete batch' })
  async delete(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.batchesService.delete(id, actor);
    return { deleted: true };
  }
}
