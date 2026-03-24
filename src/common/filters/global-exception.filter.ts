import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { FileLogService } from '../services/file-log.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly fileLogService: FileLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message ?? message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaError = this.mapPrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    void this.fileLogService.logError({
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
      statusCode: status,
      method: request?.method,
      url: request?.url,
    });

    response.status(status).json({
      success: false,
      message,
      data: null,
    });
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: 'Unique constraint violation' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Requested record was not found' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, message: 'Related record constraint failed' };
      default:
        return { status: HttpStatus.BAD_REQUEST, message: 'Database request failed' };
    }
  }
}
