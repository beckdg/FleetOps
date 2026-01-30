import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';
import { generateApiKey } from '../../src/integrations/utils/api-key.util';

export const DEMO_WEBHOOK_URL = 'https://example.com/webhooks/fleetops-demo';
export const DEMO_API_KEY_NAME = 'Demo integration key';
export const DEMO_WEBHOOK_NAME = 'Demo webhook sink';

export async function seedIntegrations(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping integrations seed');
    return;
  }

  const dispatcher = await context.prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_DISPATCHER_EMAIL,
      },
    },
  });

  if (!dispatcher) {
    context.logger.warn('Demo dispatcher not found — skipping integrations seed');
    return;
  }

  const generated = generateApiKey();

  await context.prisma.apiKey.upsert({
    where: { hashedKey: generated.hashedKey },
    update: {
      name: DEMO_API_KEY_NAME,
      isActive: true,
    },
    create: {
      organizationId: organization.id,
      name: DEMO_API_KEY_NAME,
      keyPrefix: generated.keyPrefix,
      hashedKey: generated.hashedKey,
      createdByUserId: dispatcher.id,
    },
  });

  await context.prisma.webhookEndpoint.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: DEMO_WEBHOOK_NAME,
      },
    },
    update: {
      url: DEMO_WEBHOOK_URL,
      isActive: true,
    },
    create: {
      organizationId: organization.id,
      name: DEMO_WEBHOOK_NAME,
      url: DEMO_WEBHOOK_URL,
      secret: 'demo_webhook_secret_change_in_production',
    },
  });

  context.logger.info(
    `Seeded demo integrations (API key prefix ${generated.keyPrefix}, webhook ${DEMO_WEBHOOK_NAME})`,
  );
  context.logger.info(
    `Demo API key plaintext (store securely, shown once): ${generated.plaintextKey}`,
  );
}
