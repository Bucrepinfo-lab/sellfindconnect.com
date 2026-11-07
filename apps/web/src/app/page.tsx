import { PublicHome } from '../components/PublicHome';

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.slice(0, 160) ?? '';
}

/** Public home: search real published adverts and read the policies. Nothing tied to a role is shown here. */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <PublicHome
      initial={{ q: first(params.q), industry: first(params.industry), role: first(params.role) }}
    />
  );
}
