import {
  buildWebhookSignatureHeader,
  parseWebhookSignatureHeader,
  verifyWebhookSignature,
} from './webhook-signature.util';

describe('webhook-signature.util', () => {
  it('builds X-FleetOps-Signature compatible header values', () => {
    const payload = {
      eventId: 'event-1',
      eventType: 'trip.created',
      organizationId: 'org-1',
      occurredAt: '2026-06-05T12:00:00.000Z',
      data: { tripId: 'trip-1' },
    };

    const { body, header } = buildWebhookSignatureHeader('secret-value', payload);
    const parsed = parseWebhookSignatureHeader(header);

    expect(body).toContain('"tripId":"trip-1"');
    expect(parsed).not.toBeNull();
    expect(verifyWebhookSignature('secret-value', body, parsed!.timestamp, parsed!.signature)).toBe(
      true,
    );
    expect(verifyWebhookSignature('wrong-secret', body, parsed!.timestamp, parsed!.signature)).toBe(
      false,
    );
  });

  it('returns null for malformed signature headers', () => {
    expect(parseWebhookSignatureHeader('invalid')).toBeNull();
  });
});
