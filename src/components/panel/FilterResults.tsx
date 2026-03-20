'use client'

import { useState, useEffect, useRef } from 'react'
import type { FilterState, School } from '@/types/school'
import { DEFAULT_FILTERS } from '@/types/school'
import { useSchools } from '@/hooks/useSchools'
import { useSchoolZones } from '@/hooks/useSchoolZones'
import { findSchoolZonesForPoint, type ZoneLookupResult } from '@/utils/findSchoolZones'
import SchoolCard from './SchoolCard'


interface FilterResultsProps {
  filters: FilterState
  onSelectSchool: (school: School) => void
  onZoneResult: (ids: string[]) => void
}

function ProximityPanel({ filters, onSelectSchool, onZoneResult }: FilterResultsProps) {
  const proximity = filters.proximity!
  const isZone = proximity.radiusMiles === 0

  const { schools: allSchools } = useSchools(DEFAULT_FILTERS, { showAll: true })
  const { geojson, loading: zonesLoading } = useSchoolZones(true)
  const [zoneResult, setZoneResult] = useState<ZoneLookupResult | null>(null)
  const onZoneResultRef = useRef(onZoneResult)
  onZoneResultRef.current = onZoneResult

  useEffect(() => {
    if (!geojson || !allSchools.length) return
    const r = findSchoolZonesForPoint(proximity.lat, proximity.lng, geojson as never, allSchools)
    setZoneResult(r)
    const ids = [r.Elementary?.id, r.Middle?.id, r.High?.id].filter((id): id is string => id != null)
    onZoneResultRef.current(ids)
  }, [proximity.lat, proximity.lng, geojson, allSchools])

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

function NonProximityPanel({ filters, onSelectSchool }: Pick<FilterResultsProps, 'filters' | 'onSelectSchool'>) {
  const { schools, loading } = useSchools(filters)

  if (loading) return (
    <div className="bg-white px-4 py-2 text-xs text-gray-500">
      Loading…
    </div>
  )

  return (
    <div className="bg-white px-4 py-3 h-full">
      <p className="text-xs text-gray-500 font-medium mb-2">
        {schools.length === 0
          ? 'No matching schools'
          : `${schools.length} school${schools.length !== 1 ? 's' : ''} match your filters`}
      </p>
      <div className="flex flex-col gap-3">
        {schools.map((school) => (
          <SchoolCard key={school.id} school={school} onSelect={onSelectSchool} />
        ))}
      </div>
    </div>
  )
}

export default function FilterResults({ filters, onSelectSchool, onZoneResult }: FilterResultsProps) {
  if (filters.proximity) {
    return <ProximityPanel filters={filters} onSelectSchool={onSelectSchool} onZoneResult={onZoneResult} />
  }
  return <NonProximityPanel filters={filters} onSelectSchool={onSelectSchool} />
}
