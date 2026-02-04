export interface WebhookHttpResponse {
  statusCode: number;
  body: string;
}

export interface WebhookHttpClient {
  post(url: string, headers: Record<string, string>, body: string): Promise<WebhookHttpResponse>;
}

export const WEBHOOK_HTTP_CLIENT = Symbol('WEBHOOK_HTTP_CLIENT');
