import { Injectable, Logger } from "@nestjs/common";
import type { SearchQuery, SearchResult, SearchAdapter } from "../../../domain/src/search";
import { EmbeddingService } from "./adapters/embedding.service";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  constructor(private readonly adapter: SearchAdapter, private readonly embedder: EmbeddingService) {}

  async search(query: SearchQuery): Promise<{ results: SearchResult[]; mode: string; total: number }> {
    const text = query.text?.trim();
    if (!text) return { results: [], mode: "EMPTY", total: 0 };
    let embedding: number[]|null = null;
    if (this.embedder.isEnabled) {
      try { embedding = await this.embedder.embed(text); } catch(e:any) { this.logger.warn("Embedding failed, FTS fallback: " + e.message); }
    }
    const mode = embedding ? "HYBRID" : "FTS";
    const results = await this.adapter.search({ ...query, mode });
    this.logger.log("[search] " + JSON.stringify(text) + " -> " + results.length + " results (" + mode + ")");
    return { results, mode, total: results.length };
  }

  async indexAdvert(advert: { advertId:string; tenantId:string; countryId:string; title:string; displayName:string; description:string; industryCode:string; role:string; publishedAt:string; }): Promise<void> {
    let embedding: number[]|null = null;
    if (this.embedder.isEnabled) {
      const text = [advert.title, advert.displayName, advert.description, advert.industryCode, advert.role].join(" ");
      try { embedding = await this.embedder.embed(text); } catch { }
    }
    await this.adapter.index({ ...advert, embedding: embedding ?? undefined });
  }

  async removeAdvert(advertId: string): Promise<void> {
    await this.adapter.remove(advertId);
  }
}
