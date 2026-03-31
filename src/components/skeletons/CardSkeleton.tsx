export default function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-800/30 bg-neutral-900/50 p-5 flex flex-col gap-3">
      <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-neutral-800 rounded animate-pulse" />
      <div className="h-4 w-3/5 bg-neutral-800 rounded animate-pulse" />
    </div>
  );
}
