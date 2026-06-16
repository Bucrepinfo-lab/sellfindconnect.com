import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  advertLifecyclePolicy,
  calculateAdvertLifecycle,
  evaluateSafetyFields,
  getCountry,
  industryCategories,
  type AdvertPost,
} from '@telpen/domain';
import { randomUUID } from 'node:crypto';

import type { CreateAdvertDto, RunAdvertLifecycleDto } from './dto/create-advert.dto';

type AdvertNotification = {
  id: string;
  tenantId: string;
  advertId: string;
  title: string;
  message: string;
  scheduledFor: string;
  day: number;
  createdAt: string;
};

@Injectable()
export class AdvertsService {
  private readonly adverts = new Map<string, AdvertPost>();
  private readonly notifications = new Map<string, AdvertNotification>();

  createAdvert(tenantId: string, input: CreateAdvertDto): AdvertPost {
    const country = getCountry(input.countryCode);
    const industry = industryCategories.find((item) => item.code === input.industryCode);

    if (!country) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (!industry) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const safety = evaluateSafetyFields(input);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This advert matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const now = new Date().toISOString();
    const publishedAt = input.publishedAt ?? now;
    const lifecycle = calculateAdvertLifecycle(publishedAt, now);
    const advert: AdvertPost = {
      ...input,
      id: randomUUID(),
      tenantId,
      status: lifecycle.shouldAutoDelete ? 'AUTO_DELETED' : 'LIVE',
      publishedAt,
      expiresAt: lifecycle.expiresAt,
      renewalAlertsSent: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: lifecycle.shouldAutoDelete ? now : undefined,
    };

    this.adverts.set(this.key(tenantId, advert.id), advert);
    return advert;
  }

  listAdverts(tenantId: string): AdvertPost[] {
    return Array.from(this.adverts.values()).filter(
      (advert) => advert.tenantId === tenantId && advert.status !== 'AUTO_DELETED',
    );
  }

  listNotifications(tenantId: string): AdvertNotification[] {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.tenantId === tenantId,
    );
  }

  runLifecycle(tenantId: string, input: RunAdvertLifecycleDto = {}) {
    const now = input.now ?? new Date().toISOString();
    const alerts: AdvertNotification[] = [];
    const deleted: AdvertPost[] = [];

    for (const advert of Array.from(this.adverts.values())) {
      if (advert.tenantId !== tenantId || advert.status === 'AUTO_DELETED') continue;

      const lifecycle = calculateAdvertLifecycle(advert.publishedAt, now);
      if (lifecycle.shouldAutoDelete) {
        const deletedAdvert: AdvertPost = {
          ...advert,
          status: 'AUTO_DELETED',
          deletedAt: now,
          updatedAt: now,
        };
        this.adverts.set(this.key(tenantId, advert.id), deletedAdvert);
        deleted.push(deletedAdvert);
        continue;
      }

      const dueDays = lifecycle.renewalAlertDaysDue.filter(
        (day) => !advert.renewalAlertsSent.includes(day),
      );
      if (dueDays.length > 0) {
        const updatedAdvert: AdvertPost = {
          ...advert,
          status: 'RENEWAL_DUE',
          renewalAlertsSent: [...advert.renewalAlertsSent, ...dueDays].sort((a, b) => a - b),
          updatedAt: now,
        };
        this.adverts.set(this.key(tenantId, advert.id), updatedAdvert);

        for (const day of dueDays) {
          const notification = this.createRenewalNotification(tenantId, updatedAdvert, day, now);
          this.notifications.set(notification.id, notification);
          alerts.push(notification);
        }
      }
    }

    return {
      policy: advertLifecyclePolicy,
      checkedAt: now,
      alertsCreated: alerts,
      autoDeleted: deleted,
      activeAdverts: this.listAdverts(tenantId),
    };
  }

  runAllLifecycles(input: RunAdvertLifecycleDto = {}) {
    const tenantIds = [...new Set(Array.from(this.adverts.values()).map((advert) => advert.tenantId))];
    const checkedAt = input.now ?? new Date().toISOString();
    return {
      checkedAt,
      policy: advertLifecyclePolicy,
      tenantsChecked: tenantIds.length,
      results: tenantIds.map((tenantId) => ({
        tenantId,
        ...this.runLifecycle(tenantId, { ...input, now: checkedAt }),
      })),
    };
  }

  private createRenewalNotification(
    tenantId: string,
    advert: AdvertPost,
    day: number,
    now: string,
  ): AdvertNotification {
    return {
      id: randomUUID(),
      tenantId,
      advertId: advert.id,
      day,
      title: `Renew advert: ${advert.title}`,
      message: `Your advert has been live for ${day} days and will be automatically deleted on day ${advertLifecyclePolicy.liveDays}. Renew it to keep it visible.`,
      scheduledFor: now,
      createdAt: now,
    };
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }
}
