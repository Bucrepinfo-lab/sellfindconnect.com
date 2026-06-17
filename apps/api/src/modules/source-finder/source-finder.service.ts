import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  evaluateSafetyFields,
  evaluateSafetyText,
  getCountry,
  industryCategories,
  pilotSourceFinderRecords,
  searchSourceFinderRecords,
  type SourceFinderRecord,
} from '@telpen/domain';

import type { SearchSourceFinderDto } from './dto/search-source-finder.dto';

@Injectable()
export class SourceFinderService {
  private readonly records: SourceFinderRecord[] = pilotSourceFinderRecords;

  search(input: SearchSourceFinderDto) {
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

    const results = searchSourceFinderRecords(input, this.records);

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
