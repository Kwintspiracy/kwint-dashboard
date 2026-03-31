export default function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800/30 bg-neutral-900/50 p-5">
      <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
      <div className="h-8 w-24 bg-neutral-800 rounded animate-pulse mt-2" />
      <div className="h-3 w-32 bg-neutral-800/60 rounded animate-pulse mt-2" />
    </div>
  );
}
