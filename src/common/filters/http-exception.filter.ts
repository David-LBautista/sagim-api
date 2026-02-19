import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

interface ErrorResponse {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
  details?: any;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = null;

    // 1. NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        details = (exceptionResponse as any).details;
      }
    }
    // 2. MongoDB Duplicate Key Error (E11000)
    else if (
      exception instanceof MongoError &&
      (exception as any).code === 11000
    ) {
      status = HttpStatus.CONFLICT;
      error = 'DuplicateKeyError';

      const keyValue = (exception as any).keyValue;
      const field = Object.keys(keyValue || {})[0];

      message = field
        ? `Ya existe un registro con ${field}: ${keyValue[field]}`
        : 'Ya existe un registro con estos datos';

      details = { field, value: keyValue?.[field] };
    }
    // 3. Mongoose CastError (ID inválido)
    else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'InvalidObjectId';
      message = `ID inválido: ${exception.value}`;
      details = { field: exception.path, value: exception.value };
    }
    // 4. Mongoose ValidationError
    else if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'ValidationError';

      const errors = Object.values(exception.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));

      message = 'Error de validación';
      details = errors;
    }
    // 5. JWT Errors
    else if (exception instanceof Error) {
      if (exception.name === 'JsonWebTokenError') {
        status = HttpStatus.UNAUTHORIZED;
        error = 'InvalidToken';
        message = 'Token inválido';
      } else if (exception.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED;
        error = 'TokenExpired';
        message = 'Token expirado';
      } else if (exception.name === 'NotBeforeError') {
        status = HttpStatus.UNAUTHORIZED;
        error = 'TokenNotActive';
        message = 'Token aún no es válido';
      }
      // 6. MongoDB Connection Errors
      else if (exception.name === 'MongoNetworkError') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'DatabaseConnectionError';
        message = 'Error de conexión con la base de datos';
      } else if (exception.name === 'MongoTimeoutError') {
        status = HttpStatus.REQUEST_TIMEOUT;
        error = 'DatabaseTimeout';
        message = 'La operación en la base de datos excedió el tiempo límite';
      }
      // 7. Generic Error
      else {
        message = exception.message || 'Error interno del servidor';
        error = exception.name || 'InternalServerError';
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
    };

    // Solo incluir detalles si existen
    if (details) {
      errorResponse.details = details;
    }

    // Stack trace solo en desarrollo
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log the error con contexto completo
    const logMessage = `[${error}] ${request.method} ${request.url} - ${message}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : String(exception),
        'ExceptionFilter',
      );
    } else {
      this.logger.warn(logMessage, 'ExceptionFilter');
    }

    response.status(status).json(errorResponse);
  }
}
