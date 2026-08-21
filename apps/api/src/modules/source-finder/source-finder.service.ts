import { Injectable, Optional, UnprocessableEntityException } from '@nestjs/common';
import {
  attachApprovedRelationshipClaims,
  evaluateSafetyFields,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  pilotSourceFinderRecords,
  searchSourceFinderRecords,
  type SourceFinderRecord,
} from '@telpen/domain';

import { RelationshipsService } from '../relationships/relationships.service';
import type { SearchSourceFinderDto } from './dto/search-source-finder.dto';

@Injectable()
export class SourceFinderService {
  private readonly records: SourceFinderRecord[] = pilotSourceFinderRecords;

  constructor(@Optional() private readonly relationships?: RelationshipsService) {}

  async search(input: SearchSourceFinderDto) {
    const safety = evaluateSafetyText(input.query);
    if (!safety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This Source Finder search matches a zero-tolerance blocked category.',
        safety,
      });
    }

    const fieldSafety = evaluateSafetyFields(input);
    if (!fieldSafety.allowed) {
      throw new UnprocessableEntityException({
        message: 'This Source Finder request contains blocked content.',
        safety: fieldSafety,
      });
    }

    if (input.countryCode && !getCountry(input.countryCode)) {
      throw new UnprocessableEntityException('Unsupported country.');
    }

    if (
      input.industryCode &&
      input.industryCode !== 'ALL' &&
      !industryCategories.some((industry) => industry.code === input.industryCode)
    ) {
      throw new UnprocessableEntityException('Unsupported industry.');
    }

    const graphClaims = this.relationships ? await this.relationships.listGraph() : [];
    const records = attachApprovedRelationshipClaims(this.records, graphClaims);
    const results = searchSourceFinderRecords(input, records);

    return {
      query: input.query,
      sortBy: input.sortBy ?? 'RELEVANCE',
      filters: {
        countryCode: input.countryCode ?? null,
        industryCode: input.industryCode ?? null,
        role: input.role ?? null,
      },
      total: results.length,
      results,
    };
  }
}
