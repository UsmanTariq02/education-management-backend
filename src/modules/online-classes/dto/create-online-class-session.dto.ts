import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsUUID } from 'class-validator';

export class CreateOnlineClassSessionDto {
  @ApiProperty()
  @IsUUID()
  timetableEntryId!: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  scheduledStartAt!: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  scheduledEndAt!: Date;
}
