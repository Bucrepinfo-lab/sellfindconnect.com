import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>404 — Page not found</h1>
      <p style={{ color: '#666' }}>The page you are looking for does not exist.</p>
      <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
        Return home
      </Link>
    </main>
  );
}
