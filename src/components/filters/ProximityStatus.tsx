'use client'

import type { ProximityFilter } from '@/types/school'

interface ProximityStatusProps {
  proximity: ProximityFilter
  onChange: (proximity: ProximityFilter | null) => void
}

export default function ProximityStatus({ proximity, onChange }: ProximityStatusProps) {
  return (
    <div className="flex flex-nowrap gap-1 items-center min-w-0">
      <button
        onClick={() => onChange(null)}
        className="text-xs font-bold border rounded px-2.5 py-0.5 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors truncate max-w-40 sm:max-w-xs"
      >
        {proximity.label}
      </button>
      {([0, 3, 5, 10] as const).map((r) => (
        <button
          key={r}
          onClick={() => onChange({ ...proximity, radiusMiles: r })}
          className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
            proximity.radiusMiles === r
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          }`}
        >
          {r === 0 ? 'Zone' : `${r} mi`}
        </button>
      ))}
    </div>
  )
}
