import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { INTEGRATIONS_API_KEY_AUTH } from '../constants/integrations.constants';
import { ApiKeyContext } from '../interfaces/api-key-context.interface';

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ApiKeyContext => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [INTEGRATIONS_API_KEY_AUTH]?: ApiKeyContext }>();

    const apiKeyContext = request[INTEGRATIONS_API_KEY_AUTH];

    if (!apiKeyContext) {
      throw new Error('ApiKeyGuard must be applied before CurrentApiKey');
    }

    return apiKeyContext;
  },
);
