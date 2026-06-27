import type { SearchAdapter, SearchQuery, SearchResult } from "../../../../domain/src/search";
import { normaliseFtsRank, blendScores } from "../../../../domain/src/search";

interface Row { advertId:string; tenantId:string; title:string; displayName:string; description:string; countryCode:string; industryCode:string; role:string; publishedAt:string; boostedAt:string|null; boostWeight:number|null; ftsRank:number; similarity:number|null; }

export class PostgresSearchAdapter implements SearchAdapter {
  readonly name = "postgres-fts-pgvector";
  constructor(private db: { $queryRawUnsafe(sql:string,...p:unknown[]): Promise<unknown[]> }) {}

  async search(q: SearchQuery): Promise<SearchResult[]> {
    const mode = q.mode ?? "HYBRID";
    const limit = Math.min(q.limit ?? 20, 100);
    const offset = q.offset ?? 0;
    const conds: string[] = ["\"status\" = 'LIVE'", "\"expiresAt\" > NOW()"];
    const params: unknown[] = [];
    let p = 1;
    if (q.countryCode)  { conds.push(`"countryCode" = $${p++}`);  params.push(q.countryCode); }
    if (q.industryCode) { conds.push(`"industryCode" = $${p++}`); params.push(q.industryCode); }
    if (q.role)         { conds.push(`"role" = $${p++}`);         params.push(q.role); }
    if (q.tenantId)     { conds.push(`"tenantId" != $${p++}`);    params.push(q.tenantId); }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    const tsq = q.text.trim().split(/\s+/).filter(Boolean).map(w => w + ":*").join(" & ") || "''";
    params.push(tsq); const tp = p++;
    params.push(limit, offset); const lp = p++; const op = p++;
    const sql = `SELECT "advertId","tenantId","title","displayName","description","countryCode","industryCode","role","publishedAt"::text,"boostedAt"::text,"boostWeight",ts_rank("searchVector",to_tsquery('english',$${tp})) AS "ftsRank",NULL::float AS "similarity" FROM "AdvertDiscoveryIndex" ${where} AND "searchVector" @@ to_tsquery('english',$${tp}) ORDER BY CASE WHEN "boostedAt" IS NOT NULL THEN "boostWeight" ELSE 0 END DESC,"ftsRank" DESC,"publishedAt" DESC LIMIT $${lp} OFFSET $${op}`;
    const rows = await this.db.$queryRawUnsafe(sql, ...params) as Row[];
    return rows.map(r => {
      const fts = normaliseFtsRank(r.ftsRank);
      const vec = r.similarity ?? 0;
      const score = mode === "FTS" ? fts : mode === "SEMANTIC" ? vec : blendScores(fts, vec);
      const rc: string[] = [];
      if (fts > 0.1) rc.push("KEYWORD_MATCH");
      if (vec > 0.7) rc.push("SEMANTIC_MATCH");
      if (r.boostedAt) rc.push("BOOST_ACTIVE");
      return { advertId: r.advertId, tenantId: r.tenantId, title: r.title, displayName: r.displayName, description: r.description, countryCode: r.countryCode, industryCode: r.industryCode, role: r.role, score: Math.round(score * 1000) / 1000, scoreType: mode, reasonCodes: rc, publishedAt: r.publishedAt, boostedAt: r.boostedAt ?? undefined, boostWeight: r.boostWeight ?? undefined };
    });
  }

  async index(a: { advertId:string; tenantId:string; countryId:string; title:string; displayName:string; description:string; industryCode:string; role:string; publishedAt:string; embedding?:number[]; }): Promise<void> {
    if (a.embedding) {
      await this.db.$queryRawUnsafe(`UPDATE "AdvertDiscoveryIndex" SET "embedding" = $1::vector WHERE "advertId" = $2`, "[" + a.embedding.join(",") + "]", a.advertId);
    }
  }

  async remove(advertId: string): Promise<void> {
    await this.db.$queryRawUnsafe(`DELETE FROM "AdvertDiscoveryIndex" WHERE "advertId" = $1`, advertId);
  }
}
