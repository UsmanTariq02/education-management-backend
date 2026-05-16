import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export enum AiReviewStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  ARCHIVED = 'ARCHIVED',
}

export class SaveAiReviewQueueItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(50)
  kind!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(500)
  summary!: string;

  @IsString()
  body!: string;

  @IsEnum(AiReviewStatus)
  status!: AiReviewStatus;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  archivedAt?: string | null;

  @IsOptional()
  @IsDateString()
  approvedAt?: string | null;
}

export class SaveAiReviewQueueDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAiReviewQueueItemDto)
  items!: SaveAiReviewQueueItemDto[];
}
