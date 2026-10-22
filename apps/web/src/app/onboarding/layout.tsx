import type { Metadata } from "next";
export const metadata: Metadata = { title: "Get started — SellFindConnect", description: "Publish your first advert or find your first supplier in seconds." };
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Hanken+Grotesk:wght@400;600&family=IBM+Plex+Mono:wght@400&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/onboarding.css" />
      {children}
    </>
  );
}
