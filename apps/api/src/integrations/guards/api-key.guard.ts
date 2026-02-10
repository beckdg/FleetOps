import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { INTEGRATIONS_API_KEY_AUTH } from '../constants/integrations.constants';
import { ApiKeyContext } from '../interfaces/api-key-context.interface';
import { ApiKeyRepository } from '../api-keys.repository';
import { hashApiKey, isApiKeyToken } from '../utils/api-key.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyRepository: ApiKeyRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { [INTEGRATIONS_API_KEY_AUTH]?: ApiKeyContext }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!isApiKeyToken(token)) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const apiKey = await this.apiKeyRepository.findByHashedKey(hashApiKey(token));

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('API key has expired');
    }

    await this.apiKeyRepository.touchLastUsedAt(apiKey.id);

    request[INTEGRATIONS_API_KEY_AUTH] = {
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
    };

    return true;
  }
}
