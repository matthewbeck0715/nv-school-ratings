'use client'

import { useCallback, useRef } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { useSchoolZones } from '@/hooks/useSchoolZones'
import { getZoneBoundaryColor } from '@/utils/markerColors'
import type { SchoolLevel } from '@/types/school'

interface ZoneBoundariesProps {
  zonedSchoolIds: string[]
  selectedSchoolId?: string | null
  onZoneClick?: (schoolId: string) => void
}

function getFeatureStyle(feature: GeoJSON.Feature | undefined, selectedSchoolId: string | null | undefined) {
  const level = feature?.properties?.level as SchoolLevel
  const color = getZoneBoundaryColor(level)
  const isSelected = feature?.properties?.schoolId === selectedSchoolId
  return {
    color,
    fillColor: color,
    fillOpacity: isSelected ? 0.25 : 0.10,
    weight: isSelected ? 3 : 2,
  }
}

export default function ZoneBoundaries({ zonedSchoolIds, selectedSchoolId, onZoneClick }: ZoneBoundariesProps) {
  const { geojson } = useSchoolZones(true)
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const canvasRenderer = useRef(L.canvas({ padding: 0.5 }))

  const styleFn = useCallback(
    (feature: GeoJSON.Feature | undefined) => getFeatureStyle(feature, selectedSchoolId),
    [selectedSchoolId]
  )

  if (!geojson) return null

  const idSet = new Set(zonedSchoolIds)
  const fc = geojson as GeoJSON.FeatureCollection
  const LEVEL_ORDER: Record<string, number> = { High: 0, Middle: 1, Elementary: 2 }
  const filtered: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: fc.features.filter(f => idSet.has(f.properties?.schoolId)),
  }
  filtered.features.sort((a, b) =>
    (LEVEL_ORDER[a.properties?.level] ?? 1) - (LEVEL_ORDER[b.properties?.level] ?? 1)
  )

  if (filtered.features.length === 0) return null

  return (
    <GeoJSON
      ref={geoJsonRef}
      key={zonedSchoolIds.join(',')}
      data={filtered}
      {...{ renderer: canvasRenderer.current } as Record<string, unknown>}
      onEachFeature={(feature, layer) => {
        if (onZoneClick) {
          layer.on('click', () => {
            const schoolId = feature.properties?.schoolId
            if (schoolId) onZoneClick(schoolId)
          })
        }
      }}
      style={styleFn}
    />
  )
}
