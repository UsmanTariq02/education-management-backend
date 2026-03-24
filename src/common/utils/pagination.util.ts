import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PrismaPagination {
  skip: number;
  take: number;
}

export const buildPagination = (query: PaginationQueryDto): PrismaPagination => ({
  skip: (query.page - 1) * query.limit,
  take: query.limit,
});
