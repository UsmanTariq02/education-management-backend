import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (
          typeof value === 'object' &&
          value !== null &&
          'success' in (value as Record<string, unknown>) &&
          'data' in (value as Record<string, unknown>)
        ) {
          return value;
        }

        return {
          success: true,
          message: 'Request successful',
          data: value,
        };
      }),
    );
  }
}
