import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import simplify from '@turf/simplify'
import { point } from '@turf/helpers'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

const CCSD_BASE = 'https://maps.clarkcountynv.gov/arcgis/rest/services/OpenData/Education/MapServer'

const LAYERS = [
  { id: 4, level: 'Elementary' },
  { id: 5, level: 'Middle' },
  { id: 6, level: 'High' },
]

// Manual overrides: ArcGIS SCHOOL field value → nv-schools.json school id
// Add entries here for any school that fails point-in-polygon and name matching
const BOUNDARY_MANUAL_MAP = {}

// --- Fetch helpers ---

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }
}

async function fetchArcGISLayer(layerId) {
  const features = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const url = `${CCSD_BASE}/${layerId}/query?where=1%3D1&outFields=*&f=geojson&resultOffset=${offset}&resultRecordCount=${pageSize}`
    const data = await fetchWithRetry(url)
    if (!data.features?.length) break
    features.push(...data.features)
    if (data.features.length < pageSize) break
    offset += pageSize
  }

  return features
}

// --- Geometry optimization ---

function truncateCoords(coords, precision = 5) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => parseFloat(c.toFixed(precision)))
  }
  return coords.map(ring => truncateCoords(ring, precision))
}

function optimizeGeometry(geometry) {
  if (!geometry) return geometry
  return {
    ...geometry,
    coordinates: truncateCoords(geometry.coordinates),
  }
}

// --- Name normalization for matching ---

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(elementary|middle|high|school|academy|es|ms|hs|jr|sr)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// --- Main ---

async function main() {
  // Load existing school data
  const schools = JSON.parse(readFileSync(join(dataDir, 'nv-schools.json'), 'utf8'))

  // Only District schools in Clark County can have CCSD attendance zones
  const clarkDistrict = schools.filter(
    s => s.county === 'Clark' && s.type === 'District' && s.lat && s.lng
  )

  console.log(`Loaded ${schools.length} total schools, ${clarkDistrict.length} Clark County District schools with coordinates`)

  // Fetch all three CCSD boundary layers
  const allBoundaries = []
  for (const { id, level } of LAYERS) {
    process.stdout.write(`Fetching layer ${id} (${level})...`)
    const features = await fetchArcGISLayer(id)
    console.log(` ${features.length} boundaries`)
    for (const f of features) {
      f._level = level
    }
    allBoundaries.push(...features)
  }

  console.log(`\nTotal boundaries fetched: ${allBoundaries.length}`)

  // Build name index for Clark District schools grouped by level
  const schoolsByLevel = {}
  for (const school of clarkDistrict) {
    if (!schoolsByLevel[school.level]) schoolsByLevel[school.level] = []
    schoolsByLevel[school.level].push(school)
  }

  // Track which school IDs have already been assigned a boundary (prevent duplicate assignments)
  const assignedSchoolIds = new Set()

  // Match each boundary to a school
  const matched = []
  const unmatchedBoundaries = []

  for (const boundary of allBoundaries) {
    if (!boundary.geometry) {
      console.warn(`  Skipping boundary with no geometry: ${boundary.properties?.SCHOOL}`)
      continue
    }

    const arcgisName = boundary.properties?.SCHOOL || ''
    const level = boundary._level
    const candidates = (schoolsByLevel[level] || []).filter(s => !assignedSchoolIds.has(s.id))

    let matchedSchool = null

    // Tier 1: Manual override
    if (BOUNDARY_MANUAL_MAP[arcgisName]) {
      const candidate = schools.find(s => s.id === BOUNDARY_MANUAL_MAP[arcgisName])
      if (candidate && !assignedSchoolIds.has(candidate.id)) matchedSchool = candidate
    }

    // Tier 2: Name normalization match (run before point-in-polygon to avoid co-located school confusion)
    if (!matchedSchool) {
      const normalizedArcgis = normalizeName(arcgisName)
      const fullName = boundary.properties?.FULLNAME || ''
      const normalizedFull = normalizeName(fullName)

      let bestScore = 0
      for (const school of candidates) {
        const normalizedSchool = normalizeName(school.name)
        if (!normalizedSchool) continue

        // Score: exact match = 2x bonus; partial contains scored by similarity ratio
        // to avoid "Valley HS" stealing "Green Valley" from "Green Valley HS"
        let score = 0
        if (normalizedArcgis === normalizedSchool || normalizedFull === normalizedSchool) {
          score = normalizedSchool.length * 2  // exact match wins
        } else if (normalizedArcgis.includes(normalizedSchool) || normalizedSchool.includes(normalizedArcgis)) {
          const matchLen = Math.min(normalizedArcgis.length, normalizedSchool.length)
          const maxLen = Math.max(normalizedArcgis.length, normalizedSchool.length)
          score = matchLen / maxLen  // similarity ratio
        } else if (normalizedFull.includes(normalizedSchool) || normalizedSchool.includes(normalizedFull)) {
          const matchLen = Math.min(normalizedFull.length, normalizedSchool.length)
          const maxLen = Math.max(normalizedFull.length, normalizedSchool.length)
          score = matchLen / maxLen
        }

        if (score > bestScore) {
          bestScore = score
          matchedSchool = school
        }
      }
    }

    // Tier 3: Point-in-polygon fallback — find a school whose lat/lng falls inside this boundary
    if (!matchedSchool) {
      for (const school of candidates) {
        const pt = point([school.lng, school.lat])
        if (booleanPointInPolygon(pt, boundary)) {
          matchedSchool = school
          break
        }
      }
    }

    if (matchedSchool) {
      assignedSchoolIds.add(matchedSchool.id)
      // Simplify and optimize geometry
      let optimizedFeature
      try {
        const simplified = simplify(boundary, { tolerance: 0.0001, highQuality: false, mutate: false })
        optimizedFeature = {
          type: 'Feature',
          properties: {
            schoolId: matchedSchool.id,
            schoolName: matchedSchool.name,
            level: matchedSchool.level,
          },
          geometry: optimizeGeometry(simplified.geometry),
        }
      } catch {
        // Fall back to just truncating if simplify fails
        optimizedFeature = {
          type: 'Feature',
          properties: {
            schoolId: matchedSchool.id,
            schoolName: matchedSchool.name,
            level: matchedSchool.level,
          },
          geometry: optimizeGeometry(boundary.geometry),
        }
      }
      matched.push(optimizedFeature)
    } else {
      unmatchedBoundaries.push({ arcgisName, level, fullName: boundary.properties?.FULLNAME })
    }
  }

  // Output GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: matched,
  }

  const outPath = join(dataDir, 'school-zones.geojson')
  writeFileSync(outPath, JSON.stringify(geojson))

  const fileSizeKB = Math.round(Buffer.byteLength(JSON.stringify(geojson)) / 1024)

  // Report
  console.log(`\n=== Match Report ===`)
  console.log(`Boundaries fetched:  ${allBoundaries.length}`)
  console.log(`Boundaries matched:  ${matched.length}`)
  console.log(`Boundaries unmatched: ${unmatchedBoundaries.length}`)
  console.log(`Output file size:    ${fileSizeKB} KB`)
  console.log(`Output: ${outPath}`)

  if (unmatchedBoundaries.length > 0) {
    console.log(`\nUnmatched boundaries:`)
    for (const b of unmatchedBoundaries) {
      console.log(`  [${b.level}] SCHOOL="${b.arcgisName}" FULLNAME="${b.fullName}"`)
    }
  }

  // Report Clark District schools with no boundary
  const matchedIds = new Set(matched.map(f => f.properties.schoolId))
  const noZone = clarkDistrict.filter(s => !matchedIds.has(s.id))
  if (noZone.length > 0) {
    console.log(`\nClark District schools with no zone (${noZone.length}):`)
    for (const s of noZone) {
      console.log(`  [${s.level}] ${s.name} (${s.id})`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
