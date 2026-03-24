import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { CreateFeeRecordDto } from './dto/create-fee-record.dto';
import { UpdateFeeRecordDto } from './dto/update-fee-record.dto';
import { FeesService } from './fees.service';

@ApiTags('Fees')
@ApiBearerAuth()
@Controller({ path: 'fees', version: '1' })
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('plans')
  @Permissions('fees.create')
  @ApiOperation({ summary: 'Create student fee plan' })
  async createPlan(@Body() payload: CreateFeePlanDto, @CurrentUser() actor: CurrentUserContext) {
    return this.feesService.createPlan(payload, actor);
  }

  @Get('plans')
  @Permissions('fees.read')
  @ApiOperation({ summary: 'List fee plans' })
  async listPlans(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.feesService.listPlans(query, actor);
  }

  @Post('records')
  @Permissions('fees.create')
  @ApiOperation({ summary: 'Create fee record' })
  async createRecord(@Body() payload: CreateFeeRecordDto, @CurrentUser() actor: CurrentUserContext) {
    return this.feesService.createRecord(payload, actor);
  }

  @Get('records')
  @Permissions('fees.read')
  @ApiOperation({ summary: 'List fee records' })
  async listRecords(@Query() query: PaginationQueryDto, @CurrentUser() actor: CurrentUserContext) {
    return this.feesService.listRecords(query, actor);
  }

  @Patch('records/:id')
  @Permissions('fees.update')
  @ApiOperation({ summary: 'Update fee record' })
  async updateRecord(
    @Param('id') id: string,
    @Body() payload: UpdateFeeRecordDto,
    @CurrentUser() actor: CurrentUserContext,
  ) {
    return this.feesService.updateRecord(id, payload, actor);
  }

  @Delete('records/:id')
  @Permissions('fees.delete')
  @ApiOperation({ summary: 'Delete fee record' })
  async deleteRecord(@Param('id') id: string, @CurrentUser() actor: CurrentUserContext): Promise<{ deleted: boolean }> {
    await this.feesService.deleteRecord(id, actor);
    return { deleted: true };
  }
}
