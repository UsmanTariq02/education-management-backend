import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsUUID } from 'class-validator';

export class BulkUpdateStatusDto {
  @ApiProperty({ type: [String], description: 'Record IDs to update in bulk' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ description: 'Target active state to apply to all selected records' })
  @IsBoolean()
  isActive!: boolean;
}
