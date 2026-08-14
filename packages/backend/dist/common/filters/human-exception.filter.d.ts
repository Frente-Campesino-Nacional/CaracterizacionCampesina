import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export declare class HumanExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
    private translateMessage;
}
