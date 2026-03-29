export default function StatCard({
  label,
  value,
  detail,
  trend,
  color = 'emerald',
}: {
  label: string
  value: string | number
  detail?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'emerald' | 'red' | 'amber' | 'blue' | 'purple'
}) {
  const colorMap = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-5 hover:bg-neutral-800/30 transition-colors">
      <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorMap[color] || 'text-white'}`}>{value}</p>
      {detail && (
        <p className="text-xs text-neutral-500 mt-2">{detail}</p>
      )}
    </div>
  )
}
