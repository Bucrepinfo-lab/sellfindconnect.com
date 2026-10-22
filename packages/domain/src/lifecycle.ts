export const advertLifecyclePolicy = {
  liveDays: 40,
  renewalAlertDays: [35, 39],
} as const;

export type AdvertLifecycleStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'RENEWAL_DUE'
  | 'EXPIRED_FOR_DELETION';

export type AdvertLifecycleState = {
  publishedAt: string;
  expiresAt: string;
  daysLive: number;
  daysRemaining: number;
  status: AdvertLifecycleStatus;
  renewalAlertDaysDue: number[];
  shouldAutoDelete: boolean;
  isScheduled: boolean;
};

const dayMs = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * dayMs);
}

export function calculateAdvertLifecycle(
  publishedAtIso: string,
  nowIso = new Date().toISOString(),
): AdvertLifecycleState {
  const publishedAt = new Date(publishedAtIso);
  const now = new Date(nowIso);
  const expiresAt = addDays(publishedAt, advertLifecyclePolicy.liveDays);
  const rawDaysLive = Math.floor((now.getTime() - publishedAt.getTime()) / dayMs);
  const daysLive = Math.max(0, rawDaysLive);
  const daysRemaining = Math.max(0, advertLifecyclePolicy.liveDays - daysLive);
  const isScheduled = now.getTime() < publishedAt.getTime();
  const shouldAutoDelete = !isScheduled && now.getTime() >= expiresAt.getTime();
  const renewalAlertDaysDue = isScheduled
    ? []
    : advertLifecyclePolicy.renewalAlertDays.filter((day) => daysLive >= day && !shouldAutoDelete);

  return {
    publishedAt: publishedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    daysLive: isScheduled ? 0 : daysLive,
    daysRemaining,
    status: isScheduled
      ? 'SCHEDULED'
      : shouldAutoDelete
        ? 'EXPIRED_FOR_DELETION'
        : renewalAlertDaysDue.length > 0
          ? 'RENEWAL_DUE'
          : 'LIVE',
    renewalAlertDaysDue,
    shouldAutoDelete,
    isScheduled,
  };
}
