import { Injectable } from '@nestjs/common';

import { WebhookHttpClient, WebhookHttpResponse } from './interfaces/webhook-http-client.interface';

@Injectable()
export class FetchWebhookHttpClient implements WebhookHttpClient {
  async post(
    url: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<WebhookHttpResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    });

    const responseBody = await response.text();

    return {
      statusCode: response.status,
      body: responseBody.slice(0, 4096),
    };
  }
}
