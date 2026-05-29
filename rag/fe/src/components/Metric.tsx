import type { ReactNode } from 'react'

export function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon: ReactNode
}) {
  return (
    <div className="rounded-md border border-[#d9dee8] bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between text-[#667085]">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  )
}
