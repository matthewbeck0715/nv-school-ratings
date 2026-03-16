// point = [lng, lat] — GeoJSON coordinate order
function raycast(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside
  }
  return inside
}

export function pointInGeoJSONGeometry(
  point: [number, number],
  geometry: { type: string; coordinates: unknown }
): boolean {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][]
    if (!raycast(point, rings[0])) return false
    for (let i = 1; i < rings.length; i++) if (raycast(point, rings[i])) return false
    return true
  }
  if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates as number[][][][]) {
      if (!raycast(point, poly[0])) continue
      if (poly.slice(1).every(hole => !raycast(point, hole))) return true
    }
  }
  return false
}
