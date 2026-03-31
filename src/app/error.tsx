'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="bg-neutral-900/50 border border-red-900/50 rounded-xl p-6 max-w-md w-full text-center">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h2>
        <p className="text-sm text-neutral-400 mb-6 break-words">
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && (
          <p className="text-xs text-neutral-600 mb-4 font-mono">digest: {error.digest}</p>
        )}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/stats"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
