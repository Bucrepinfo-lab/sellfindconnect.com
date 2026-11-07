import { parseHomeWorkspaceQuery } from '@telpen/domain';

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
  const landing = parseHomeWorkspaceQuery(await searchParams);
  return (
    <PublicHome
      initial={{
        q: landing.query?.slice(0, 160) ?? '',
        industry: landing.industryCode ?? '',
        role: landing.role ?? '',
      }}
    />
  );
}
