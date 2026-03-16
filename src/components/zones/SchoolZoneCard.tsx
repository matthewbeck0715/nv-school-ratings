'use client'

import type { School, SchoolLevel } from '@/types/school'
import { getMarkerColor } from '@/utils/markerColors'

interface SchoolZoneCardProps {
  level: SchoolLevel
  school: School | null
  onSelect: (school: School) => void
}

function pct(val: number | string | null | undefined): string {
  return val != null ? `${val}%` : '—'
}

export default function SchoolZoneCard({ level, school, onSelect }: SchoolZoneCardProps) {
  const inner = school ? (
    <div className="flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{level}</p>
        <p className="font-semibold text-gray-900 text-sm leading-tight mt-0.5">{school.name}</p>
        {school.address && school.city && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${school.name}, ${school.address}, ${school.city}, NV ${school.zip ?? ''}`.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-500 hover:underline mt-0.5 inline-block"
          >
            <span className="block">{school.address}</span>
            <span className="block">{school.city}, NV{school.zip ? ` ${school.zip}` : ''}</span>
          </a>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs shrink-0">
        <div>
          <div className="text-gray-400">Stars</div>
          <div className="font-medium" style={{ color: getMarkerColor(school.starRating) }}>{school.starRating !== null ? '★'.repeat(school.starRating) : 'NR'}</div>
        </div>
        <div>
          <div className="text-gray-400">Score</div>
          <div className="font-medium">{school.indexScore}</div>
        </div>
        <div>
          <div className="text-gray-400">ELA Proficiency</div>
          <div className="font-medium">{pct(school.elaProficiency)}</div>
        </div>
        <div>
          <div className="text-gray-400">Math Proficiency</div>
          <div className="font-medium">{pct(school.mathProficiency)}</div>
        </div>
        <div>
          <div className="text-gray-400">ELA Growth</div>
          <div className="font-medium">{pct(school.elaGrowth)}</div>
        </div>
        <div>
          <div className="text-gray-400">Math Growth</div>
          <div className="font-medium">{pct(school.mathGrowth)}</div>
        </div>
      </div>
    </div>
  ) : (
    <p className="text-xs text-gray-400 leading-snug">
      No zone data for this address.
    </p>
  )

  const baseClass = 'rounded-lg border border-gray-200 p-3 flex-1 bg-white text-left'

  return school ? (
    <button
      onClick={() => onSelect(school)}
      className={`${baseClass} hover:border-blue-400 hover:shadow-sm transition-colors`}
    >
      {inner}
    </button>
  ) : (
    <div className={baseClass}>
      {inner}
    </div>
  )
}
