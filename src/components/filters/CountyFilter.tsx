'use client'

const ALL_COUNTIES = [
  'Carson City', 'Churchill', 'Clark', 'Douglas', 'Elko',
  'Esmeralda', 'Eureka', 'Humboldt', 'Lander', 'Lincoln',
  'Lyon', 'Mineral', 'Nye', 'Pershing',
  'Storey', 'Washoe', 'White Pine',
]

interface CountyFilterProps {
  value: string | null
  onChange: (value: string | null) => void
}

export default function CountyFilter({ value, onChange }: CountyFilterProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500 font-medium mr-1">County:</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="border border-gray-300 rounded px-2 py-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
      >
        <option value="">All</option>
        {ALL_COUNTIES.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  )
}
