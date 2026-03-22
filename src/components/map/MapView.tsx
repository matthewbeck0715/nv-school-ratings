import dynamic from 'next/dynamic'
import type { FilterState, School } from '@/types/school'

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
      Loading map…
    </div>
  ),
})

interface MapViewProps {
  filters: FilterState
  selectedSchool?: School | null
  isVisible?: boolean
  onSelectSchool?: (school: School) => void
  onCountyFilter?: (county: string) => void
}

export default function MapView({ filters, selectedSchool, isVisible, onSelectSchool, onCountyFilter }: MapViewProps) {
  return (
    <div className="w-full h-full">
      <MapInner filters={filters} selectedSchool={selectedSchool} isVisible={isVisible} onSelectSchool={onSelectSchool} onCountyFilter={onCountyFilter} />
    </div>
  )
}
