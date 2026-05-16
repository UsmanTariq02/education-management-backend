import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ArrayMaxSize, ValidateNested } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class BulkCreateAttendanceDto {
  @ApiProperty({ type: [CreateAttendanceDto] })
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  items!: CreateAttendanceDto[];
}
