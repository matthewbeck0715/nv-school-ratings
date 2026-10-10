'use client'

import { createContext, useContext } from 'react'
import { LATEST_YEAR, type DataYear } from '@/types/school'

// Lets components deep in the tree (comparison panel, zone lookups) read the selected data year
// without threading it through every prop.
export const YearContext = createContext<DataYear>(LATEST_YEAR)

export function useYear(): DataYear {
  return useContext(YearContext)
}
