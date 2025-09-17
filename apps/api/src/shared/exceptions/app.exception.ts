import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
  ) {
    super(
      {
        statusCode,
        message,
        code,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
