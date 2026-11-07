import type { Metadata } from 'next';

import { ListingDetail } from '../../../components/ListingDetail';

export const metadata: Metadata = { title: 'Business listing · SellFindConnect' };

/** Public detail page for one published advert (opened from search results). */
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
