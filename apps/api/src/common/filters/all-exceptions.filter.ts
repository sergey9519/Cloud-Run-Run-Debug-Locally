
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // Safely cast exception to check for getStatus or fallback
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    if (exception instanceof HttpException) {
        httpStatus = (exception as HttpException).getStatus();
    }

    const request = ctx.getRequest();
    const path = httpAdapter.getRequestUrl(request);
    const method = httpAdapter.getRequestMethod(request);

    // Extract Error Details
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = undefined;

    if (exception instanceof HttpException) {
      const response = (exception as HttpException).getResponse();
      // Handle both string and object responses safely
      if (typeof response === 'object' && response !== null) {
          const respObj = response as Record<string, any>;
          errorCode = (respObj.error as string) || (HttpStatus[httpStatus] as string) || 'HTTP_ERROR';
          
          // Handle nested validation errors (class-validator array)
          if (Array.isArray(respObj.message)) {
              errorMessage = respObj.message.join(', ');
          } else {
              errorMessage = (respObj.message as string) || (exception as HttpException).message;
          }
          
          errorDetails = respObj.details || undefined;
      } else {
          errorMessage = String(response);
          errorCode = (HttpStatus[httpStatus] as string) || 'HTTP_ERROR';
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorCode = exception.name.toUpperCase().replace(/ /g, '_');
    } else {
      // Fallback for non-standard errors
      errorMessage = String(exception);
    }

    // Detailed Logging
    const logContext = `[${method}] ${path}`;
    const stack = exception instanceof Error ? exception.stack : null;
    
    if (httpStatus >= 500) {
      this.logger.error(
        `CRITICAL ERROR ${logContext} -> ${errorMessage}`,
        stack
      );
    } else {
      this.logger.warn(
        `CLIENT ERROR ${logContext} -> [${httpStatus}] ${errorMessage}`
      );
    }

    // Standardized JSON Response
    const responseBody = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
        path: path,
      },
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
