'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>
            {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred.'}
          </p>
          <button
            onClick={reset}
            style={{ padding: '0.5rem 1.25rem', cursor: 'pointer', borderRadius: '0.375rem', border: '1px solid #ccc' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
