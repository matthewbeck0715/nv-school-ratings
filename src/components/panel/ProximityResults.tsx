'use client'

import { useState, useEffect, useRef } from 'react'
import type { FilterState, School } from '@/types/school'
import { useSchools } from '@/hooks/useSchools'
import { useSchoolZones } from '@/hooks/useSchoolZones'
import { findSchoolZonesForPoint, type ZoneLookupResult } from '@/utils/findSchoolZones'
import SchoolCard from './SchoolCard'

const EMPTY_FILTERS: FilterState = { search: '', schoolTypes: [], schoolLevels: [], starRatings: [], county: null, proximity: null, zonedSchoolIds: null }

interface ProximityResultsProps {
  filters: FilterState
  onSelectSchool: (school: School) => void
  onZoneResult: (ids: string[] | null) => void
}

export default function ProximityResults({ filters, onSelectSchool, onZoneResult }: ProximityResultsProps) {
  const proximity = filters.proximity!
  const isZone = proximity.radiusMiles === 0

  // Zone data (always fetched so it's ready when switching to zone mode)
  const { schools: allSchools } = useSchools(EMPTY_FILTERS)
  const { geojson, loading: zonesLoading } = useSchoolZones(true)
  const [zoneResult, setZoneResult] = useState<ZoneLookupResult | null>(null)
  const onZoneResultRef = useRef(onZoneResult)
  onZoneResultRef.current = onZoneResult

  useEffect(() => {
    onZoneResultRef.current(null)
    if (!geojson || !allSchools.length) return
    const r = findSchoolZonesForPoint(proximity.lat, proximity.lng, geojson as never, allSchools)
    setZoneResult(r)
    const ids = [r.Elementary?.id, r.Middle?.id, r.High?.id].filter((id): id is string => id != null)
    onZoneResultRef.current(ids.length > 0 ? ids : null)
  }, [proximity.lat, proximity.lng, geojson, allSchools])

  // Nearby schools (always fetched so it's ready when switching to radius mode)
  const { schools: nearbySchools, loading: nearbyLoading } = useSchools(filters)

  const loading = isZone ? zonesLoading : nearbyLoading

  if (loading) return (
    <div className="bg-white px-4 py-2 text-xs text-gray-500">
      Loading…
    </div>
  )

  if (isZone) {
    if (!zoneResult || (!zoneResult.Elementary && !zoneResult.Middle && !zoneResult.High)) return null
    return (
      <div className="bg-white px-4 py-3 h-full">
        <p className="text-xs text-gray-500 font-medium mb-2">Schools zoned for {proximity.label}</p>
        <div className="flex flex-col gap-3">
          {zoneResult.Elementary && <SchoolCard school={zoneResult.Elementary} onSelect={onSelectSchool} />}
          {zoneResult.Middle && <SchoolCard school={zoneResult.Middle} onSelect={onSelectSchool} />}
          {zoneResult.High && <SchoolCard school={zoneResult.High} onSelect={onSelectSchool} />}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white px-4 py-3 h-full">
      <p className="text-xs text-gray-500 font-medium mb-2">
        {nearbySchools.length === 0
          ? `No schools within ${proximity.radiusMiles} mi of ${proximity.label}`
          : `${nearbySchools.length} school${nearbySchools.length !== 1 ? 's' : ''} within ${proximity.radiusMiles} mi of ${proximity.label}`}
      </p>
      <div className="flex flex-col gap-3">
        {nearbySchools.map((school) => (
          <SchoolCard key={school.id} school={school} distanceMiles={school.distanceMiles} onSelect={onSelectSchool} />
        ))}
      </div>
    </div>
  )
}
