import { redirect } from 'next/navigation';

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  const query = await searchParams;
  for (const [key, value] of Object.entries(query)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) {
      params.set(key, first);
    }
  }
  params.set('view', 'discover');
  redirect(`/?${params.toString()}`);
}
