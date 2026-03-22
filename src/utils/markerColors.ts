import type L from 'leaflet'
import type { SchoolLevel, StarRating } from '@/types/school'

const STAR_COLORS: Record<StarRating, string> = {
  1: '#ef4444', // red
  2: '#f97316', // orange
  3: '#eab308', // yellow
  4: '#22c55e', // green
  5: '#3b82f6', // blue
}

export function getMarkerColor(starRating: StarRating | null): string {
  return starRating !== null ? STAR_COLORS[starRating] : '#9ca3af'
}

let userLocationIconCache: L.DivIcon | undefined

export function createUserLocationIcon(): L.DivIcon {
  if (userLocationIconCache) return userLocationIconCache
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  const icon: L.DivIcon = L.divIcon({
    className: '',
    html: `<div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: #2563eb;
      border: 3px solid white;
      box-shadow: 0 0 0 2px #2563eb, 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  })
  userLocationIconCache = icon
  return icon
}

const ZONE_BOUNDARY_COLORS: Record<SchoolLevel, string> = {
  Elementary: '#3b82f6', // blue
  Middle: '#f59e0b',     // amber
  High: '#10b981',       // emerald
}

export function getZoneBoundaryColor(level: SchoolLevel): string {
  return ZONE_BOUNDARY_COLORS[level] ?? '#6b7280'
}

const markerIconCache = new Map<StarRating | null, L.DivIcon>()

export function createMarkerIcon(starRating: StarRating | null) {
  const cached = markerIconCache.get(starRating)
  if (cached) return cached
  // Use require to avoid top-level import (SSR-safe when called client-side only)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  const color = getMarkerColor(starRating)
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      font-family: sans-serif;
    ">${starRating ?? 'NR'}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
  markerIconCache.set(starRating, icon)
  return icon
}
