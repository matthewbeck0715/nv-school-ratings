'use client'

import { DATA_YEARS, yearLabel, type DataYear } from '@/types/school'

interface YearFilterProps {
  value: DataYear
  onChange: (value: DataYear) => void
}

export default function YearFilter({ value, onChange }: YearFilterProps) {
  return (
    <div className="flex items-center gap-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DataYear)}
        aria-label="Year"
        className="border border-gray-300 rounded px-2 py-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
      >
        {DATA_YEARS.map((year) => (
          <option key={year} value={year}>{yearLabel(year)}</option>
        ))}
      </select>
    </div>
  )
}
