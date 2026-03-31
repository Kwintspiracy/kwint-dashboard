import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-500 mb-2">404</h1>
        <p className="text-neutral-400 mb-6">Page not found</p>
        <Link
          href="/stats"
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
