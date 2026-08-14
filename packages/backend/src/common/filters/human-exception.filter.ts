import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HumanExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Ocurrió un error interno en el servidor';

    if (exception instanceof HttpException) {
      const resResponse = exception.getResponse();
      if (typeof resResponse === 'string') {
        message = this.translateMessage(resResponse);
      } else if (typeof resResponse === 'object' && resResponse !== null) {
        const rawMessage = (resResponse as any).message;
        if (Array.isArray(rawMessage)) {
          message = rawMessage.map((m) => this.translateMessage(String(m)));
        } else if (typeof rawMessage === 'string') {
          message = this.translateMessage(rawMessage);
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private translateMessage(msg: string): string {
    const str = msg.trim();
    const lower = str.toLowerCase();

    if (lower.includes('email must be an email') || lower.includes('email invalido')) {
      return 'El correo electrónico no tiene un formato válido.';
    }
    if (lower.includes('should not be empty') || lower.includes('is required')) {
      return 'Todos los campos requeridos deben completarse.';
    }
    if (lower.includes('password must be longer than')) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (lower.includes('unauthorized') || lower.includes('invalid credentials')) {
      return 'El correo electrónico o la contraseña ingresados no son correctos.';
    }

    return str;
  }
}
