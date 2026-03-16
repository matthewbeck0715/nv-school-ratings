'use client'

import { useState, useEffect, useRef } from 'react'
import type { School, ProximityFilter } from '@/types/school'
import { useSchools } from '@/hooks/useSchools'
import { useSchoolZones } from '@/hooks/useSchoolZones'
import { findSchoolZonesForPoint, type ZoneLookupResult } from '@/utils/findSchoolZones'
import SchoolZoneCard from './SchoolZoneCard'

const EMPTY_FILTERS = { search: '', schoolTypes: [], schoolLevels: [], starRatings: [], county: null, proximity: null, zonedSchoolIds: null }

interface SchoolZoneResultsProps {
  proximity: ProximityFilter
  onSelectSchool: (school: School) => void
  onResult: (ids: string[] | null) => void
}

export default function SchoolZoneResults({ proximity, onSelectSchool, onResult }: SchoolZoneResultsProps) {
  const { schools } = useSchools(EMPTY_FILTERS)
  const { geojson, loading } = useSchoolZones(true)
  const [result, setResult] = useState<ZoneLookupResult | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    onResultRef.current(null)
    if (!geojson || !schools.length) return
    const r = findSchoolZonesForPoint(proximity.lat, proximity.lng, geojson as never, schools)
    setResult(r)
    const ids = [r.Elementary?.id, r.Middle?.id, r.High?.id].filter((id): id is string => id != null)
    onResultRef.current(ids.length > 0 ? ids : null)
  }, [proximity.lat, proximity.lng, geojson, schools])

  if (loading) return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 text-xs text-gray-500">
      Loading zone data…
    </div>
  )

  if (!result) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <p className="text-xs text-gray-500 font-medium mb-2">Schools zoned for {proximity.label}</p>
      <div className="flex flex-col lg:flex-row gap-3">
        <SchoolZoneCard level="Elementary" school={result.Elementary} onSelect={onSelectSchool} />
        <SchoolZoneCard level="Middle" school={result.Middle} onSelect={onSelectSchool} />
        <SchoolZoneCard level="High" school={result.High} onSelect={onSelectSchool} />
      </div>
    </div>
  )
}
