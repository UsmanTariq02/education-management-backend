import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEmail, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class OnlineClassParticipantInputDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  participantEmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  participantName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalParticipantId?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  joinedAt!: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  leftAt?: Date;

  @ApiProperty()
  @IsInt()
  @Min(0)
  totalMinutes!: number;
}

export class UpsertOnlineClassParticipantsDto {
  @ApiProperty({ type: [OnlineClassParticipantInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnlineClassParticipantInputDto)
  participants!: OnlineClassParticipantInputDto[];
}
