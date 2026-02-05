import { createHmac } from 'crypto';

export interface WebhookSignaturePayload {
  eventId: string;
  eventType: string;
  organizationId: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

export function buildWebhookSignatureHeader(
  secret: string,
  payload: WebhookSignaturePayload,
): { header: string; body: string } {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${body}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    body,
    header: `t=${timestamp},v1=${signature}`,
  };
}

export function parseWebhookSignatureHeader(
  header: string,
): { timestamp: number; signature: string } | null {
  const match = /^t=(\d+),v1=([a-f0-9]+)$/i.exec(header.trim());

  if (!match) {
    return null;
  }

  return {
    timestamp: Number.parseInt(match[1]!, 10),
    signature: match[2]!,
  };
}

export function verifyWebhookSignature(
  secret: string,
  body: string,
  timestamp: number,
  signature: string,
): boolean {
  const signedPayload = `${timestamp}.${body}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return expected === signature;
}
