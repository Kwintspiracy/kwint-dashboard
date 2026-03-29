'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type ToolData = { name: string; count: number }

export default function ToolUsageChart({ data }: { data: ToolData[] }) {
  if (!data.length) {
    return (
      <div className="h-60 flex items-center justify-center">
        <p className="text-neutral-600 text-sm">No data</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data.slice(0, 8)} layout="vertical" style={{ background: 'transparent' }}>
        <XAxis
          type="number"
          stroke="#404040"
          tick={{ fontSize: 11, fill: '#737373' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="#404040"
          tick={{ fontSize: 11, fill: '#a3a3a3' }}
          width={110}
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
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
