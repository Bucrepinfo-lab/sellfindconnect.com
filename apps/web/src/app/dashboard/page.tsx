import type { Metadata } from 'next';

import { Workspace } from '../../components/Workspace';

export const metadata: Metadata = {
  title: 'Your business · SellFindConnect',
  robots: { index: false },
};

/** Signed-in business owners and their team: adverts, leads, messages, saved searches. */
export default function DashboardPage() {
  return <Workspace area="member" />;
}
