'use client'

import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import { useCallback, useEffect } from 'react'
import { useSchools } from '@/hooks/useSchools'
import { createUserLocationIcon } from '@/utils/markerColors'
import type { FilterState, School } from '@/types/school'
import SchoolMarker from './SchoolMarker'
import ZoneBoundaries from './ZoneBoundaries'

interface MapInnerProps {
  filters: FilterState
  selectedSchool?: School | null
  isVisible?: boolean
  onSelectSchool?: (school: School) => void
}

const NEVADA_CENTER: [number, number] = [38.8, -116.8]
const MILES_TO_METERS = 1609.344

// County seat coordinates
const COUNTY_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  'Carson City':  { center: [39.164,  -119.767], zoom: 12 }, // Carson City
  'Churchill':    { center: [39.474,  -118.777], zoom: 12 }, // Fallon
  'Clark':        { center: [36.170,  -115.139], zoom: 11 }, // Las Vegas
  'Douglas':      { center: [38.954,  -119.767], zoom: 12 }, // Minden
  'Elko':         { center: [40.832,  -115.763], zoom: 12 }, // Elko
  'Esmeralda':    { center: [37.707,  -117.232], zoom: 13 }, // Goldfield
  'Eureka':       { center: [39.512,  -115.961], zoom: 13 }, // Eureka
  'Humboldt':     { center: [40.973,  -117.736], zoom: 12 }, // Winnemucca
  'Lander':       { center: [40.641,  -116.934], zoom: 12 }, // Battle Mountain
  'Lincoln':      { center: [37.931,  -114.453], zoom: 13 }, // Pioche
  'Lyon':         { center: [38.987,  -119.163], zoom: 12 }, // Yerington
  'Mineral':      { center: [38.524,  -118.625], zoom: 12 }, // Hawthorne
  'Nye':          { center: [38.068,  -117.230], zoom: 12 }, // Tonopah
  'Pershing':     { center: [40.180,  -118.474], zoom: 12 }, // Lovelock
  'Storey':       { center: [39.310,  -119.648], zoom: 13 }, // Virginia City
  'Washoe':       { center: [39.530,  -119.814], zoom: 11 }, // Reno
  'White Pine':   { center: [39.248,  -114.893], zoom: 12 }, // Ely
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    map.setView([lat, lng], 12)
  }, [map, lat, lng])
  return null
}

function FlyToSchool({ school }: { school: School }) {
  const map = useMap()
  useEffect(() => {
    if (school.lat && school.lng) {
      const target: [number, number] = [school.lat, school.lng]
      if (map.getZoom() === 12) {
        map.panTo(target, { animate: true, duration: 0.5 })
      } else {
        map.flyTo(target, 12)
      }
    }
  }, [school, map])
  return null
}

function InvalidateOnShow({ isVisible }: { isVisible: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => map.invalidateSize())
    }
  }, [isVisible, map])
  return null
}

function CountyFocus({ county }: { county: string | null }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (county && COUNTY_VIEWS[county]) {
      const { center, zoom } = COUNTY_VIEWS[county]
      map.flyTo(center, zoom)
    } else if (!county) {
      map.flyTo(NEVADA_CENTER, 6)
    }
  }, [map, county])
  return null
}

export default function MapInner({ filters, selectedSchool, isVisible, onSelectSchool }: MapInnerProps) {
  const { schools, loading, error } = useSchools(filters)

  const handleZoneClick = useCallback((schoolId: string) => {
    if (!onSelectSchool) return
    const school = schools.find(s => s.id === schoolId)
    if (school) onSelectSchool(school)
  }, [schools, onSelectSchool])
  const proximity = filters.proximity

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
        Loading schools…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 text-red-600">
        Error: {error}
      </div>
    )
  }

  return (
    <MapContainer
      center={proximity ? [proximity.lat, proximity.lng] : NEVADA_CENTER}
      zoom={proximity ? 12 : 6}
      className="w-full h-full"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <InvalidateOnShow isVisible={isVisible ?? true} />
      {selectedSchool && <FlyToSchool school={selectedSchool} />}
      {!proximity && <CountyFocus county={filters.county} />}
      {proximity && (
        <>
          <RecenterMap lat={proximity.lat} lng={proximity.lng} />
          {proximity.radiusMiles > 0 && <Circle
            center={[proximity.lat, proximity.lng]}
            radius={proximity.radiusMiles * MILES_TO_METERS}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.08,
              weight: 2,
            }}
          />}
          <Marker
            position={[proximity.lat, proximity.lng]}
            icon={createUserLocationIcon()}
          />
        </>
      )}
      {proximity && proximity.radiusMiles === 0 && filters.zonedSchoolIds.length > 0 && (
        <ZoneBoundaries zonedSchoolIds={filters.zonedSchoolIds} selectedSchoolId={selectedSchool?.id ?? null} onZoneClick={handleZoneClick} />
      )}
      {schools.map((school) => (
        <SchoolMarker key={school.id} school={school} isSelected={selectedSchool?.id === school.id} onSelect={onSelectSchool} />
      ))}
    </MapContainer>
  )
}
