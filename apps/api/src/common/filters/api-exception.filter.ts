import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null) {
        const safeBody = body as Record<string, unknown>;
        response.status(status).json({
          code: safeBody.code ?? `HTTP_${status}`,
          message: safeBody.message ?? exception.message,
          details: safeBody.details ?? null,
        });
        return;
      }

      response.status(status).json({
        code: `HTTP_${status}`,
        message: body,
        details: null,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected server error',
      details: null,
    });
  }
}
