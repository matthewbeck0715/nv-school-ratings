export type SchoolType = 'District' | 'Charter' | 'Magnet'
export type SchoolLevel = 'Elementary' | 'Middle' | 'High'
export type StarRating = 1 | 2 | 3 | 4 | 5

// Data years, keyed by the year the school year ends in (2026 = the 2025-26 school year).
export const DATA_YEARS = ['2026', '2025', '2024', '2023', '2022'] as const
export type DataYear = (typeof DATA_YEARS)[number]
export const LATEST_YEAR: DataYear = DATA_YEARS[0]

export function yearLabel(year: DataYear): string {
  return `${Number(year) - 1}-${year.slice(2)}`
}

export interface School {
  id: string
  name: string
  type: SchoolType
  level: SchoolLevel
  county: string | null
  starRating: StarRating | null
  indexScore: number
  elaProficiency: number | string | null
  mathProficiency: number | string | null
  scienceProficiency: number | string | null
  elaGrowth: number | string | null
  mathGrowth: number | string | null
  // Median growth percentile, from the Nevada Growth Model. Only reported for
  // grades 3-8, so these are always null for High schools.
  elaMgp: number | null
  mathMgp: number | null
  elaMgpN: number | null
  mathMgpN: number | null
  titleI: boolean
  lat: number | null
  lng: number | null
  address: string | null
  city: string | null
  zip: string | null
}

export interface ProximityFilter {
  lat: number
  lng: number
  radiusMiles: number
  label: string
}

export interface FilterState {
  year: DataYear
  search: string
  schoolTypes: SchoolType[]
  schoolLevels: SchoolLevel[]
  starRatings: (StarRating | null)[]
  county: string | null
  proximity: ProximityFilter | null
  zonedSchoolIds: string[]
}

export interface SchoolWithDistance extends School {
  distanceMiles: number | null
}

export const DEFAULT_FILTERS: FilterState = {
  year: LATEST_YEAR,
  search: '',
  schoolTypes: [],
  schoolLevels: [],
  starRatings: [],
  county: null,
  proximity: null,
  zonedSchoolIds: [],
}
