import { resolveRequestId } from './request-id.util';

describe('resolveRequestId', () => {
  it('accepts valid incoming request IDs', () => {
    const requestId = resolveRequestId('abc12345-0000-4000-8000-000000000000');

    expect(requestId).toBe('abc12345-0000-4000-8000-000000000000');
  });

  it('trims valid incoming request IDs', () => {
    const requestId = resolveRequestId('  abc12345-0000-4000-8000-000000000000  ');

    expect(requestId).toBe('abc12345-0000-4000-8000-000000000000');
  });

  it('generates a request ID when header is missing', () => {
    const requestId = resolveRequestId(undefined);

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('generates a request ID when header is too short', () => {
    const requestId = resolveRequestId('short');

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
