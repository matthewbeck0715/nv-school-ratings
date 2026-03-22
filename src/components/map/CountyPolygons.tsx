'use client'

import { useCallback, useRef, useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { useCountyBoundaries } from '@/hooks/useCountyBoundaries'
import type { SchoolWithDistance } from '@/types/school'

interface CountyPolygonsProps {
  countyGroups: Map<string, SchoolWithDistance[]>
  onCountyClick: (county: string) => void
}

export default function CountyPolygons({ countyGroups, onCountyClick }: CountyPolygonsProps) {
  const { geojson } = useCountyBoundaries(true)
  const canvasRenderer = useRef(L.canvas({ padding: 0.5 }))

  const maxCount = useMemo(() => {
    let max = 0
    for (const schools of countyGroups.values()) {
      if (schools.length > max) max = schools.length
    }
    return max
  }, [countyGroups])

  // Key derived from county group counts so GeoJSON re-renders when filters change
  const geoJsonKey = useMemo(() => {
    const parts: string[] = []
    for (const [county, schools] of countyGroups) {
      parts.push(`${county}:${schools.length}`)
    }
    return parts.join(',')
  }, [countyGroups])

  const styleFn = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      const name = feature?.properties?.NAME as string
      const count = countyGroups.get(name)?.length ?? 0

      if (count === 0) {
        return {
          color: '#9ca3af',
          fillColor: '#9ca3af',
          fillOpacity: 0.05,
          weight: 1,
        }
      }

      // Scale opacity from 0.08 to 0.30 based on count relative to max
      const opacity = maxCount > 0
        ? 0.08 + (count / maxCount) * 0.22
        : 0.08

      return {
        color: '#4f46e5',
        fillColor: '#4f46e5',
        fillOpacity: opacity,
        weight: 2,
      }
    },
    [countyGroups, maxCount]
  )

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      const name = feature.properties?.NAME as string
      const count = countyGroups.get(name)?.length ?? 0

      const label = count > 0
        ? `${name}<br>${count} ${count === 1 ? 'school' : 'schools'}`
        : name

      ;(layer as L.Path).bindTooltip(label, {
        permanent: true,
        direction: 'center',
        className: 'county-label',
      })

      if (count > 0) {
        layer.on('click', () => onCountyClick(name))
      }
    },
    [countyGroups, onCountyClick]
  )

  if (!geojson) return null

  return (
    <GeoJSON
      key={geoJsonKey}
      data={geojson as GeoJSON.FeatureCollection}
      {...{ renderer: canvasRenderer.current } as Record<string, unknown>}
      style={styleFn}
      onEachFeature={onEachFeature}
    />
  )
}
