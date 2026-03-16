import type { School } from '@/types/school'
import { pointInGeoJSONGeometry } from './pointInPolygon'

export interface ZoneLookupResult {
  Elementary: School | null
  Middle: School | null
  High: School | null
}

interface ZoneFeature {
  properties: { schoolId: string; level: string }
  geometry: { type: string; coordinates: unknown }
}

interface ZoneGeoJSON {
  features: ZoneFeature[]
}

export function findSchoolZonesForPoint(
  lat: number,
  lng: number,
  geojson: ZoneGeoJSON,
  allSchools: School[]
): ZoneLookupResult {
  const byId = new Map(allSchools.map(s => [s.id, s]))
  const result: ZoneLookupResult = { Elementary: null, Middle: null, High: null }

  for (const f of geojson.features) {
    const level = f.properties.level as keyof ZoneLookupResult
    if (result[level]) continue
    if (pointInGeoJSONGeometry([lng, lat], f.geometry)) {
      result[level] = byId.get(f.properties.schoolId) ?? null
    }
  }

  return result
}
