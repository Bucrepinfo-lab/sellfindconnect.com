import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FinancePersistencePort {
  findIdempotent(tenantId: string, scope: string, key: string): Promise<string | null>;
  saveIdempotent(tenantId: string, scope: string, key: string, resultId: string): Promise<void>;
  nextSequence(countryId: string, kind: string, year: number): Promise<number>;
  isPeriodLocked(tenantId: string, countryId: string, period: string): Promise<boolean>;
  lockPeriod(tenantId: string, countryId: string, period: string, lockedBy: string): Promise<void>;
  getReturnApproval(tenantId: string, countryId: string, period: string): Promise<{ status: string; requestedBy: string; decidedBy?: string | null } | null>;
  saveReturnApproval(tenantId: string, countryId: string, period: string, status: string, requestedBy: string, decidedBy?: string): Promise<void>;
  saveCreditNote(tenantId: string, amount: number, currency: string, reason: string, idempotencyKey: string): Promise<{ id: string }>;
  findCreditNoteByKey(tenantId: string, idempotencyKey: string): Promise<{ id: string } | null>;
  saveRefund(tenantId: string, amount: number, currency: string, reason: string, idempotencyKey: string): Promise<{ id: string }>;
  findRefundByKey(tenantId: string, idempotencyKey: string): Promise<{ id: string } | null>;
  saveChargeback(tenantId: string, amount: number, currency: string, status: string, evidence: unknown, idempotencyKey: string): Promise<{ id: string }>;
  findChargebackByKey(tenantId: string, idempotencyKey: string): Promise<{ id: string } | null>;
  saveReconciliationRun(params: { tenantId: string; countryCode: string; periodStart: Date; periodEnd: Date; provider: string; calculatedTax: number; collectedTax: number; varianceAmount: number; status: string; matchedCount: number; variances: unknown }): Promise<{ id: string }>;
  saveFinanceAlert(params: { countryTaxProfileId: string; assignedToUserId?: string; alertType: string; message: string; severity: string; dueAt: Date; dedupeKey: string }): Promise<{ id: string } | null>;
}

@Injectable()
export class PrismaFinanceRepository implements FinancePersistencePort {
  constructor(private readonly prisma: PrismaService) {}

  async findIdempotent(tenantId: string, scope: string, key: string) {
    const row = await this.prisma.financeIdempotency.findUnique({
      where: { tenantId_scope_key: { tenantId, scope, key } },
      select: { resultId: true },
    });
    return row?.resultId ?? null;
  }

  async saveIdempotent(tenantId: string, scope: string, key: string, resultId: string) {
    await this.prisma.financeIdempotency.create({ data: { tenantId, scope, key, resultId } });
  }

  async nextSequence(countryId: string, kind: string, year: number) {
    const row = await this.prisma.financeSequence.upsert({
      where: { countryId_kind_year: { countryId, kind, year } },
      create: { countryId, kind, year, value: 1 },
      update: { value: { increment: 1 } },
    });
    return row.value;
  }

  async isPeriodLocked(tenantId: string, countryId: string, period: string) {
    const lock = await this.prisma.financePeriodLock.findUnique({
      where: { tenantId_countryId_period: { tenantId, countryId, period } },
    });
    return lock !== null;
  }

  async lockPeriod(tenantId: string, countryId: string, period: string, lockedBy: string) {
    await this.prisma.financePeriodLock.create({
      data: { tenantId, countryId, period, lockedAt: new Date(), lockedBy },
    });
  }

  async getReturnApproval(tenantId: string, countryId: string, period: string) {
    return this.prisma.financeReturnApproval.findUnique({
      where: { tenantId_countryId_period: { tenantId, countryId, period } },
      select: { status: true, requestedBy: true, decidedBy: true },
    });
  }

  async saveReturnApproval(tenantId: string, countryId: string, period: string, status: string, requestedBy: string, decidedBy?: string) {
    await this.prisma.financeReturnApproval.upsert({
      where: { tenantId_countryId_period: { tenantId, countryId, period } },
      create: { tenantId, countryId, period, status, requestedBy, decidedBy, decidedAt: decidedBy ? new Date() : undefined },
      update: { status, decidedBy, decidedAt: decidedBy ? new Date() : undefined },
    });
  }

  async saveCreditNote(tenantId: string, amount: number, currency: string, reason: string, idempotencyKey: string) {
    return this.prisma.creditNote.create({ data: { tenantId, amount, currency, reason, idempotencyKey }, select: { id: true } });
  }

  async findCreditNoteByKey(tenantId: string, idempotencyKey: string) {
    return this.prisma.creditNote.findFirst({ where: { tenantId, idempotencyKey }, select: { id: true } });
  }

  async saveRefund(tenantId: string, amount: number, currency: string, reason: string, idempotencyKey: string) {
    return this.prisma.refund.create({ data: { tenantId, amount, currency, reason, idempotencyKey }, select: { id: true } });
  }

  async findRefundByKey(tenantId: string, idempotencyKey: string) {
    return this.prisma.refund.findFirst({ where: { tenantId, idempotencyKey }, select: { id: true } });
  }

  async saveChargeback(tenantId: string, amount: number, currency: string, status: string, evidence: unknown, idempotencyKey: string) {
    return this.prisma.chargeback.create({ data: { tenantId, amount, currency, status, evidence: evidence as any, idempotencyKey }, select: { id: true } });
  }

  async findChargebackByKey(tenantId: string, idempotencyKey: string) {
    return this.prisma.chargeback.findFirst({ where: { tenantId, idempotencyKey }, select: { id: true } });
  }

  async saveReconciliationRun(params: { tenantId: string; countryCode: string; periodStart: Date; periodEnd: Date; provider: string; calculatedTax: number; collectedTax: number; varianceAmount: number; status: string; matchedCount: number; variances: unknown }) {
    return this.prisma.reconciliationRun.create({
      data: {
        tenantId: params.tenantId,
        countryCode: params.countryCode,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        provider: params.provider,
        calculatedTax: params.calculatedTax,
        collectedTax: params.collectedTax,
        varianceAmount: params.varianceAmount,
        status: params.status,
        matchedCount: params.matchedCount,
        variances: params.variances as any,
      },
      select: { id: true },
    });
  }

  async saveFinanceAlert(params: { countryTaxProfileId: string; assignedToUserId?: string; alertType: string; message: string; severity: string; dueAt: Date; dedupeKey: string }) {
    const existing = await this.prisma.financeAlert.findFirst({ where: { dedupeKey: params.dedupeKey }, select: { id: true } });
    if (existing) return null;
    return this.prisma.financeAlert.create({
      data: { countryTaxProfileId: params.countryTaxProfileId, assignedToUserId: params.assignedToUserId, alertType: params.alertType, message: params.message, severity: params.severity, dueAt: params.dueAt, dedupeKey: params.dedupeKey },
      select: { id: true },
    });
  }
}
