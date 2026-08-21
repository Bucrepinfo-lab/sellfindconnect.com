import { Injectable } from '@nestjs/common';
import type {
  SavedSourceFinderSearch,
  SourceFinderIndexDocument,
  SourceFinderIndexSearchHit,
  SourceFinderIndexSearchInput,
  SourceFinderOpportunityAlert,
  SourceFinderOutcomeFeedback,
} from '@telpen/domain';
import { opportunityAlertKey, searchSourceFinderIndexDocuments } from '@telpen/domain';

import type { SourceFinderRepository } from './source-finder.repository';

@Injectable()
export class InMemorySourceFinderRepository implements SourceFinderRepository {
  private readonly savedSearches = new Map<string, SavedSourceFinderSearch>();
  private readonly alerts = new Map<string, SourceFinderOpportunityAlert>();
  private readonly outcomes = new Map<string, SourceFinderOutcomeFeedback>();
  private readonly index = new Map<string, SourceFinderIndexDocument>();

  createSavedSearch(search: SavedSourceFinderSearch): void {
    this.savedSearches.set(this.key(search.tenantId, search.id), search);
  }

  updateSavedSearch(search: SavedSourceFinderSearch): void {
    this.savedSearches.set(this.key(search.tenantId, search.id), search);
  }

  findSavedSearch(tenantId: string, id: string): SavedSourceFinderSearch | undefined {
    return this.savedSearches.get(this.key(tenantId, id));
  }

  listSavedSearches(tenantId: string): SavedSourceFinderSearch[] {
    return Array.from(this.savedSearches.values())
      .filter((search) => search.tenantId === tenantId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  listAllSavedSearches(): SavedSourceFinderSearch[] {
    return Array.from(this.savedSearches.values());
  }

  createOpportunityAlert(alert: SourceFinderOpportunityAlert): void {
    this.alerts.set(this.alertKey(alert.tenantId, alert.savedSearchId, alert.sourceRecordId), alert);
  }

  findOpportunityAlert(
    tenantId: string,
    savedSearchId: string,
    sourceRecordId: string,
  ): SourceFinderOpportunityAlert | undefined {
    return this.alerts.get(this.alertKey(tenantId, savedSearchId, sourceRecordId));
  }

  listOpportunityAlerts(tenantId: string): SourceFinderOpportunityAlert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => alert.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  createOutcomeFeedback(feedback: SourceFinderOutcomeFeedback): void {
    this.outcomes.set(this.key(feedback.tenantId, feedback.id), feedback);
  }

  listOutcomeFeedback(tenantId: string): SourceFinderOutcomeFeedback[] {
    return Array.from(this.outcomes.values())
      .filter((item) => item.tenantId === tenantId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  upsertIndexDocument(document: SourceFinderIndexDocument): void {
    this.index.set(document.id, document);
  }

  replaceIndexDocuments(documents: SourceFinderIndexDocument[]): void {
    this.index.clear();
    for (const document of documents) {
      this.index.set(document.id, document);
    }
  }

  findIndexDocument(sourceRecordId: string): SourceFinderIndexDocument | undefined {
    return this.index.get(sourceRecordId);
  }

  listIndexDocuments(): SourceFinderIndexDocument[] {
    return Array.from(this.index.values()).sort((left, right) =>
      right.indexedAt.localeCompare(left.indexedAt),
    );
  }

  searchIndexDocuments(input: SourceFinderIndexSearchInput = {}): SourceFinderIndexSearchHit[] {
    return searchSourceFinderIndexDocuments(this.listIndexDocuments(), input);
  }

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  private alertKey(tenantId: string, savedSearchId: string, sourceRecordId: string): string {
    return `${tenantId}:${opportunityAlertKey(savedSearchId, sourceRecordId)}`;
  }
}
