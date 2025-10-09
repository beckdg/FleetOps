import { INestApplication, ValidationPipe } from '@nestjs/common';

import { API_GLOBAL_PREFIX } from '../constants/app.constants';
import { AllExceptionsFilter } from '../filters/all-exceptions.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
}
