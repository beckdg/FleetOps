import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { configureApp } from './shared/bootstrap/configure-app';
import { API_GLOBAL_PREFIX } from './shared/constants/app.constants';
import { EnvironmentVariables } from './shared/constants/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.set('trust proxy', true);

  const configService = app.get(ConfigService<EnvironmentVariables, true>);
  const port = configService.get('PORT', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FleetOps API')
    .setDescription('Fleet and logistics management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`FleetOps API running on port ${port} [${nodeEnv}]`);
  logger.log(`API base path: http://localhost:${port}/${API_GLOBAL_PREFIX}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}

void bootstrap();
