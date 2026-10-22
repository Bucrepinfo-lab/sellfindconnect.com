export type SearchMode = "FTS"|"SEMANTIC"|"HYBRID";

export interface SearchQuery {
  text: string; countryCode?: string; industryCode?: string; role?: string;
  mode?: SearchMode; limit?: number; offset?: number; tenantId?: string;
}

export interface SearchResult {
  advertId: string; tenantId: string; title: string; displayName: string;
  description: string; countryCode: string; industryCode: string; role: string;
  score: number; scoreType: SearchMode; reasonCodes: string[];
  publishedAt: string; boostedAt?: string; boostWeight?: number;
}

export interface SearchAdapter {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResult[]>;
  index(advert: { advertId:string; tenantId:string; countryId:string; title:string; displayName:string; description:string; industryCode:string; role:string; publishedAt:string; embedding?:number[]; }): Promise<void>;
  remove(advertId: string): Promise<void>;
}

export const REASON = {
  KEYWORD_MATCH:  "Matches your search keywords",
  INDUSTRY_MATCH: "Same industry as your search",
  ROLE_MATCH:     "Matches the supply-chain role you need",
  COUNTRY_MATCH:  "In your target country",
  SEMANTIC_MATCH: "Semantically similar to your search",
  BOOST_ACTIVE:   "Featured listing",
  HIGH_RESPONSE:  "Fast responder",
} as const;

export const normaliseFtsRank = (rank: number): number => Math.min(1, rank / 0.3);
export const blendScores = (fts: number, vec: number, w = { fts: 0.6, vec: 0.4 }): number => fts * w.fts + vec * w.vec;
