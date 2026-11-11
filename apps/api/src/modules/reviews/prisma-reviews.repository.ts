import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type BusinessReview as PrismaBusinessReview } from '@prisma/client';
import { businessReviewStatuses, type BusinessReview, type BusinessReviewStatus } from '@telpen/domain';

import type { ReviewsRepository } from './reviews.repository';

export function createReviewsPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export class PrismaReviewsRepository implements ReviewsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(review: BusinessReview): Promise<void> {
    const data = {
      tenantId: review.tenantId,
      reviewerTenantId: review.reviewerTenantId,
      reviewerUserId: review.reviewerUserId,
      rating: review.rating,
      comment: review.comment ?? null,
      status: review.status,
      hiddenReason: review.hiddenReason ?? null,
      createdAt: new Date(review.createdAt),
      updatedAt: new Date(review.updatedAt),
    };
    await this.prisma.businessReview.upsert({
      where: { id: review.id },
      create: { id: review.id, ...data },
      update: data,
    });
  }

  async findById(id: string): Promise<BusinessReview | undefined> {
    const record = await this.prisma.businessReview.findUnique({ where: { id } });
    return record ? this.fromPrisma(record) : undefined;
  }

  async findByReviewer(
    tenantId: string,
    reviewerTenantId: string,
  ): Promise<BusinessReview | undefined> {
    const record = await this.prisma.businessReview.findUnique({
      where: { tenantId_reviewerTenantId: { tenantId, reviewerTenantId } },
    });
    return record ? this.fromPrisma(record) : undefined;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.businessReview.deleteMany({ where: { id } });
  }

  async listForBusiness(tenantId: string): Promise<BusinessReview[]> {
    const records = await this.prisma.businessReview.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listByReviewer(reviewerTenantId: string): Promise<BusinessReview[]> {
    const records = await this.prisma.businessReview.findMany({
      where: { reviewerTenantId },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listForBusinesses(tenantIds: string[]): Promise<BusinessReview[]> {
    if (tenantIds.length === 0) return [];
    const records = await this.prisma.businessReview.findMany({
      where: { tenantId: { in: tenantIds }, status: 'VISIBLE' },
    });
    return records.map((record) => this.fromPrisma(record));
  }

  async listRecent(limit: number): Promise<BusinessReview[]> {
    const records = await this.prisma.businessReview.findMany({
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return records.map((record) => this.fromPrisma(record));
  }

  private fromPrisma(record: PrismaBusinessReview): BusinessReview {
    const status: BusinessReviewStatus = (businessReviewStatuses as readonly string[]).includes(
      record.status,
    )
      ? (record.status as BusinessReviewStatus)
      : 'HIDDEN';
    return {
      id: record.id,
      tenantId: record.tenantId,
      reviewerTenantId: record.reviewerTenantId,
      reviewerUserId: record.reviewerUserId,
      rating: record.rating,
      ...(record.comment ? { comment: record.comment } : {}),
      status,
      ...(record.hiddenReason ? { hiddenReason: record.hiddenReason } : {}),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
