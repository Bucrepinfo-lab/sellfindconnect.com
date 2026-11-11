import { normalizeKenyaPlace, parseHomeWorkspaceQuery, parseListingSortMode } from '@telpen/domain';

import { PublicHome } from '../components/PublicHome';

/** Public home: search real published adverts and read the policies. Nothing tied to a role is shown here. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Filters live in the URL (?q=&industry=&role=) so a search can be shared,
  // reloaded or opened from onboarding. Unknown industry/role codes are dropped
  // rather than sent to the API.
  const params = await searchParams;
  const landing = parseHomeWorkspaceQuery(params);
  const first = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 80) ?? '';
  };
  // Area and sort also live in the URL; names that are not real places are dropped.
  const place = normalizeKenyaPlace({ county: first('county'), constituency: first('constituency'), ward: first('ward') });
  return (
    <PublicHome
      initial={{
        q: landing.query?.slice(0, 160) ?? '',
        industry: landing.industryCode ?? '',
        role: landing.role ?? '',
        county: place.county ?? '',
        constituency: place.constituency ?? '',
        ward: place.ward ?? '',
        sort: parseListingSortMode(first('sort')),
      }}
    />
  );
}
