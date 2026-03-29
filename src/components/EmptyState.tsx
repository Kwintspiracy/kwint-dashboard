export default function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
      <p className="text-4xl mb-3">{icon || '—'}</p>
      <p className="text-sm">{message}</p>
    </div>
  )
}
