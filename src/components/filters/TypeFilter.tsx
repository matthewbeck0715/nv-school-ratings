'use client'

import type { SchoolType } from '@/types/school'

const ALL_TYPES: SchoolType[] = ['District', 'Charter']

interface TypeFilterProps {
  value: SchoolType[]
  onChange: (value: SchoolType[]) => void
}

export default function TypeFilter({ value, onChange }: TypeFilterProps) {
  function toggle(type: SchoolType) {
    const next = value.includes(type)
      ? value.filter((t) => t !== type)
      : [...value, type]
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      <span className="text-xs text-gray-500 font-medium mr-1">Type:</span>
      {ALL_TYPES.map((type) => {
        const active = value.includes(type)
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            className={`px-2.5 py-0.5 rounded text-xs font-bold border transition-colors ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {type}
          </button>
        )
      })}
    </div>
  )
}
