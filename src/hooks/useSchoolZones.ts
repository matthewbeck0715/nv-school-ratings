'use client'

import { useState, useEffect } from 'react'

let cached: object | null = null

export function useSchoolZones(enabled: boolean) {
  const [geojson, setGeojson] = useState<object | null>(cached)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || cached) return
    setLoading(true)
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    fetch(`${basePath}/data/nv-school-zones.geojson`)
      .then(r => r.json())
      .then(data => {
        cached = data
        setGeojson(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [enabled])

  return { geojson, loading, error }
}
