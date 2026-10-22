import type { Metadata } from 'next';

import { Workspace } from '../../components/Workspace';

export const metadata: Metadata = {
  title: 'Staff console · SellFindConnect',
  robots: { index: false, follow: false },
};

/** Platform and regional staff only: access, analytics, finance, moderation. */
export default function AdminPage() {
  return <Workspace area="admin" />;
}
