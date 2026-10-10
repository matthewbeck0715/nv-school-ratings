'use client'

import { useMemo } from 'react'
import { DEFAULT_FILTERS } from '@/types/school'
import { useSchools } from './useSchools'
import { useYear } from './useYear'
import { useSchoolZones } from './useSchoolZones'

interface ZoneGeoJSON {
  features: { properties: { schoolId: string } }[]
}

// Counties with at least one school zone boundary in nv-school-zones.geojson.
// Used to disable "Zone" mode proximity search where we have no coverage.
export function useZonedCounties(): Set<string> {
  const year = useYear()
  const { schools } = useSchools(useMemo(() => ({ ...DEFAULT_FILTERS, year }), [year]))
  const { geojson } = useSchoolZones(true)

  return useMemo(() => {
    const counties = new Set<string>()
    if (!geojson || !schools.length) return counties
    const byId = new Map(schools.map((s) => [s.id, s]))
    for (const f of (geojson as ZoneGeoJSON).features) {
      const county = byId.get(f.properties.schoolId)?.county
      if (county) counties.add(county)
    }
    return counties
  }, [geojson, schools])
}
