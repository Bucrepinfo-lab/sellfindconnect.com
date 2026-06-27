import { Module, Injectable } from "@nestjs/common";
import { NotificationAdapterRegistry } from "../../../domain/src/notification-adapter";
import { ResendEmailAdapter } from "./adapters/email.adapter";
import { AfricasTalkingSmsAdapter } from "./adapters/sms.adapter";
import { FcmPushAdapter } from "./adapters/push.adapter";
import { InAppAdapter } from "./adapters/inapp.adapter";
import type { InAppPersistencePort } from "./adapters/inapp.adapter";
import { NotificationDispatchService } from "./notification-dispatch.service";

@Injectable()
class PrismaInAppPersistence implements InAppPersistencePort {
  async saveNotification(params: Parameters<InAppPersistencePort["saveNotification"]>[0]) {
    // Wire to PrismaService.notification.create when merging into the NestJS app
    throw new Error("PrismaInAppPersistence: inject PrismaService and implement saveNotification");
  }
}

@Module({
  providers: [
    PrismaInAppPersistence,
    {
      provide: NotificationAdapterRegistry,
      useFactory: (inApp: PrismaInAppPersistence) => {
        const registry = new NotificationAdapterRegistry();
        registry.register(new InAppAdapter(inApp));
        if (process.env.RESEND_API_KEY) registry.register(new ResendEmailAdapter());
        if (process.env.AT_API_KEY && process.env.AT_USERNAME) registry.register(new AfricasTalkingSmsAdapter());
        if (process.env.FCM_SERVICE_ACCOUNT_JSON) registry.register(new FcmPushAdapter());
        return registry;
      },
      inject: [PrismaInAppPersistence],
    },
    NotificationDispatchService,
  ],
  exports: [NotificationDispatchService, NotificationAdapterRegistry],
})
export class NotificationModule {}
