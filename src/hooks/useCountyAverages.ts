'use client'

import { useState, useEffect } from 'react'
import { useYear } from './useYear'
import type { DataYear } from '@/types/school'
import { countyLevelKey, type CountyLevelAverages } from '@/utils/countyAverages'

type Averages = Map<string, CountyLevelAverages>
const _cache = new Map<DataYear, Averages>()
const _pending = new Map<DataYear, Promise<Averages>>()

export function useCountyAverages(): Averages | null {
  const year = useYear()
  const [data, setData] = useState<Averages | null>(_cache.get(year) ?? null)

  useEffect(() => {
    const cached = _cache.get(year)
    if (cached) {
      setData(cached)
      return
    }
    setData(null)
    let pending = _pending.get(year)
    if (!pending) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
      pending = fetch(`${basePath}/data/nv-county-averages-${year}.json`)
        .then(res => res.json())
        .then((averages: Record<string, CountyLevelAverages>) => {
          const map = new Map(
            Object.values(averages).map(a => [countyLevelKey(a.county, a.level), a] as const)
          )
          _cache.set(year, map)
          return map
        })
      _pending.set(year, pending)
    }
    let cancelled = false
    pending.then(m => { if (!cancelled) setData(m) })
    return () => { cancelled = true }
  }, [year])

  return data
}
