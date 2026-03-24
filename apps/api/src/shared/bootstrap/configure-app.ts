import { INestApplication, ValidationPipe } from '@nestjs/common';

import { API_GLOBAL_PREFIX } from '../constants/app.constants';

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
}
