'use client'

import { useState } from 'react'
import type { FilterState, School } from '@/types/school'
import FilterControls from '@/components/filters/FilterControls'
import MapView from '@/components/map/MapView'
import TableView from '@/components/table/TableView'
import SchoolZoneResults from '@/components/zones/SchoolZoneResults'

const DEFAULT_FILTERS: FilterState = {
  search: '',
  schoolTypes: [],
  schoolLevels: [],
  starRatings: [],
  county: null,
  proximity: null,
  zonedSchoolIds: null,
}

export default function Home() {
  const [view, setView] = useState<'map' | 'table'>('map')
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  function handleSelectSchool(school: School) {
    setSelectedSchool(school)
    setView('map')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.svg`}
            alt=""
            width={28}
            height={28}
          />
          <h1 className="text-base font-semibold text-gray-900 leading-tight">
            Nevada School Ratings
          </h1>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm shrink-0">
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 transition-colors ${
              view === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => { setView('table'); setSelectedSchool(null) }}
            className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${
              view === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Table
          </button>
        </div>
      </header>

      {/* Filters */}
      <FilterControls filters={filters} onChange={setFilters} />
      {filters.proximity && (
        <div className="hidden sm:block">
          <SchoolZoneResults
            proximity={filters.proximity}
            onSelectSchool={handleSelectSchool}
            onResult={(ids) => setFilters(f => ({ ...f, zonedSchoolIds: ids }))}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <div className={view === 'map' ? 'h-full' : 'hidden'}>
          <MapView filters={filters} selectedSchool={selectedSchool} isVisible={view === 'map'} />
        </div>
        <div className={view === 'table' ? 'h-full' : 'hidden'}>
          <TableView filters={filters} onSelectSchool={handleSelectSchool} />
        </div>
      </main>
    </div>
  )
}
