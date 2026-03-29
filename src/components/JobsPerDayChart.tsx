'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type DayData = { date: string; completed: number; failed: number; pending: number }

export default function JobsPerDayChart({ data }: { data: DayData[] }) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center">
        <p className="text-neutral-600 text-sm">No data</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-3 text-xs text-neutral-500 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" />completed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500" />failed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" />pending</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} style={{ background: 'transparent' }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#404040"
            tick={{ fontSize: 11, fill: '#737373' }}
            tickFormatter={(v) => v.slice(5)}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#404040"
            tick={{ fontSize: 11, fill: '#737373' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0a0a0a',
              border: '1px solid #262626',
              borderRadius: 8,
              fontSize: 12,
              color: '#e5e5e5',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="completed" fill="#10b981" stackId="a" />
          <Bar dataKey="failed" fill="#ef4444" stackId="a" />
          <Bar dataKey="pending" fill="#f59e0b" stackId="a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  )
}
