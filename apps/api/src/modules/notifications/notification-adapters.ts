import { NotificationAdapterRegistry, type NotificationChannel } from '@telpen/domain';

import { AfricasTalkingSmsAdapter } from './adapters/sms.adapter';
import { FcmPushAdapter } from './adapters/push.adapter';
import { InAppAdapter, type InAppPersistencePort } from './adapters/inapp.adapter';
import { MemoryNotificationAdapter } from './adapters/memory.adapter';
import { ResendEmailAdapter } from './adapters/email.adapter';

export const NOTIFICATION_ADAPTERS = 'NOTIFICATION_ADAPTERS';

const memoryChannels: NotificationChannel[] = ['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'];

export function createDefaultNotificationAdapters(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
  inAppPersistence?: InAppPersistencePort,
): NotificationAdapterRegistry {
  const registry = new NotificationAdapterRegistry();

  for (const channel of memoryChannels) {
    registry.register(new MemoryNotificationAdapter(channel));
  }

  if (inAppPersistence) {
    registry.register(new InAppAdapter(inAppPersistence));
  }

  if (env.RESEND_API_KEY) {
    registry.register(new ResendEmailAdapter(env, fetchImpl));
  }

  if (env.AT_API_KEY && env.AT_USERNAME) {
    registry.register(new AfricasTalkingSmsAdapter(env, fetchImpl));
  }

  if (env.FCM_SERVICE_ACCOUNT_JSON) {
    registry.register(new FcmPushAdapter(env, fetchImpl));
  }

  return registry;
}
