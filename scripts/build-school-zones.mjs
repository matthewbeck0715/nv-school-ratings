import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import simplify from '@turf/simplify'
import { point } from '@turf/helpers'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

// --- Clark County (CCSD) ArcGIS config ---

const CCSD_BASE = 'https://maps.clarkcountynv.gov/arcgis/rest/services/OpenData/Education/MapServer'

const CCSD_LAYERS = [
  { id: 4, level: 'Elementary' },
  { id: 5, level: 'Middle' },
  { id: 6, level: 'High' },
]

// Manual overrides: ArcGIS SCHOOL field value → nv-school-data.json school id
const CLARK_MANUAL_MAP = {}

// --- Washoe County config ---

// Manual overrides: Washoe zone NAME (or NAME_LEVEL for Gerlach) → school id
const WASHOE_MANUAL_MAP = {
  'ALICE SMITH': '16260.1',     // Smith Alice ES
  'KATE SMITH': '16225.1',     // Smith Kate ES
  'VETERANS': '16220.1',       // Veterans Memorial STEM ES
  'SPANISH SPRINGS_ES': '16269.1', // Spanish Spgs ES
  'SPANISH SPRINGS_HS': '16606.3', // Spanish Springs HS
  'GERLACH K-12_ES': '16601.1', // Gerlach K 12 ES
  'GERLACH K-12_MS': '16601.2', // Gerlach K 12 MS
  'BOHACH': '16244.1',         // JOHN BOHACH ES
  'WINNEMUCCA': '16270.1',     // Winnemucca ES
  'MOUNT ROSE': '16211.1',     // Mount Rose K-8 ES (level: Other)
}

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

// --- Name normalization ---

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(elementary|middle|high|school|academy|es|ms|hs|jr|sr|stem|memorial|john)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameWords(name) {
  return new Set(normalizeName(name).split(' ').filter(Boolean))
}

// --- Shared matching ---

function simplifyFeature(feature) {
  try {
    const simplified = simplify(feature, { tolerance: 0.0001, highQuality: false, mutate: false })
    return optimizeGeometry(simplified.geometry)
  } catch {
    return optimizeGeometry(feature.geometry)
  }
}

function createOutputFeature(school, geometry) {
  return {
    type: 'Feature',
    properties: {
      schoolId: school.id,
      schoolName: school.name,
      level: school.level,
    },
    geometry,
  }
}

// --- Clark County matching ---

function matchClarkBoundary(boundary, candidates, schools) {
  const arcgisName = boundary.properties?.SCHOOL || ''

  // Tier 1: Manual override
  if (CLARK_MANUAL_MAP[arcgisName]) {
    const candidate = schools.find(s => s.id === CLARK_MANUAL_MAP[arcgisName])
    if (candidate) return candidate
  }

  // Tier 2: Name normalization match
  const normalizedArcgis = normalizeName(arcgisName)
  const fullName = boundary.properties?.FULLNAME || ''
  const normalizedFull = normalizeName(fullName)

  let bestScore = 0
  let bestMatch = null
  for (const school of candidates) {
    const normalizedSchool = normalizeName(school.name)
    if (!normalizedSchool) continue

    let score = 0
    if (normalizedArcgis === normalizedSchool || normalizedFull === normalizedSchool) {
      score = normalizedSchool.length * 2
    } else if (normalizedArcgis.includes(normalizedSchool) || normalizedSchool.includes(normalizedArcgis)) {
      const matchLen = Math.min(normalizedArcgis.length, normalizedSchool.length)
      const maxLen = Math.max(normalizedArcgis.length, normalizedSchool.length)
      score = matchLen / maxLen
    } else if (normalizedFull.includes(normalizedSchool) || normalizedSchool.includes(normalizedFull)) {
      const matchLen = Math.min(normalizedFull.length, normalizedSchool.length)
      const maxLen = Math.max(normalizedFull.length, normalizedSchool.length)
      score = matchLen / maxLen
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = school
    }
  }

  if (bestMatch) return bestMatch

  // Tier 3: Point-in-polygon fallback
  for (const school of candidates) {
    const pt = point([school.lng, school.lat])
    if (booleanPointInPolygon(pt, boundary)) return school
  }

  return null
}

// --- Washoe County matching ---

function matchWashoeZone(zone, candidates, schools) {
  const zoneName = zone.properties?.NAME || ''
  const level = zone._level

  // Tier 1: Manual override (try level-specific key first, then plain name)
  const levelSuffix = level === 'Elementary' ? 'ES' : level === 'Middle' ? 'MS' : 'HS'
  const manualKey = `${zoneName}_${levelSuffix}`

  if (WASHOE_MANUAL_MAP[manualKey]) {
    const candidate = schools.find(s => s.id === WASHOE_MANUAL_MAP[manualKey])
    if (candidate) return candidate
  }
  if (WASHOE_MANUAL_MAP[zoneName]) {
    const candidate = schools.find(s => s.id === WASHOE_MANUAL_MAP[zoneName])
    if (candidate) return candidate
  }

  // Tier 2: Name matching (word-based + substring)
  const normalizedZone = normalizeName(zoneName)
  const zoneWordSet = nameWords(zoneName)

  let bestScore = 0
  let bestMatch = null
  for (const school of candidates) {
    const normalizedSchool = normalizeName(school.name)
    if (!normalizedSchool) continue

    let score = 0
    if (normalizedZone === normalizedSchool) {
      score = normalizedSchool.length * 2
    } else {
      const sWords = nameWords(school.name)
      let overlap = 0
      for (const w of zoneWordSet) {
        if (sWords.has(w)) overlap++
      }
      if (overlap > 0) {
        score = overlap / Math.max(zoneWordSet.size, sWords.size)
        if (overlap === zoneWordSet.size || overlap === sWords.size) {
          score += overlap
        }
      }
      if (normalizedZone.includes(normalizedSchool) || normalizedSchool.includes(normalizedZone)) {
        const matchLen = Math.min(normalizedZone.length, normalizedSchool.length)
        const maxLen = Math.max(normalizedZone.length, normalizedSchool.length)
        const subScore = matchLen / maxLen + matchLen / 10
        if (subScore > score) score = subScore
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = school
    }
  }

  if (bestMatch && bestScore >= 0.3) return bestMatch

  // Tier 3: Point-in-polygon fallback
  for (const school of candidates) {
    const pt = point([school.lng, school.lat])
    try {
      if (booleanPointInPolygon(pt, zone)) return school
    } catch {
      // Skip invalid geometries
    }
  }

  return null
}

// --- Main ---

async function main() {
  const schools = JSON.parse(readFileSync(join(dataDir, 'nv-school-data.json'), 'utf8'))

  // ========== CLARK COUNTY ==========
  console.log('=== Clark County (CCSD) ===')

  const clarkDistrict = schools.filter(
    s => s.county === 'Clark' && s.type === 'District' && s.lat && s.lng
  )
  console.log(`${clarkDistrict.length} Clark District schools with coordinates`)

  // Fetch CCSD boundary layers
  const clarkBoundaries = []
  for (const { id, level } of CCSD_LAYERS) {
    process.stdout.write(`Fetching layer ${id} (${level})...`)
    const features = await fetchArcGISLayer(id)
    console.log(` ${features.length} boundaries`)
    for (const f of features) {
      f._level = level
    }
    clarkBoundaries.push(...features)
  }
  console.log(`Total boundaries fetched: ${clarkBoundaries.length}`)

  // Build school index by level
  const clarkByLevel = {}
  for (const school of clarkDistrict) {
    if (!clarkByLevel[school.level]) clarkByLevel[school.level] = []
    clarkByLevel[school.level].push(school)
  }

  // Match Clark boundaries
  const clarkAssigned = new Set()
  const clarkMatched = []
  const clarkUnmatched = []

  for (const boundary of clarkBoundaries) {
    if (!boundary.geometry) {
      console.warn(`  Skipping boundary with no geometry: ${boundary.properties?.SCHOOL}`)
      continue
    }

    const level = boundary._level
    const candidates = (clarkByLevel[level] || []).filter(s => !clarkAssigned.has(s.id))
    const match = matchClarkBoundary(boundary, candidates, schools)

    if (match && !clarkAssigned.has(match.id)) {
      clarkAssigned.add(match.id)
      clarkMatched.push(createOutputFeature(match, simplifyFeature(boundary)))
    } else {
      clarkUnmatched.push({
        name: boundary.properties?.SCHOOL,
        level,
        fullName: boundary.properties?.FULLNAME,
      })
    }
  }

  console.log(`Matched: ${clarkMatched.length}, Unmatched: ${clarkUnmatched.length}`)

  // ========== WASHOE COUNTY ==========
  console.log('\n=== Washoe County ===')

  const washoeDistrict = schools.filter(
    s => s.county === 'Washoe' && s.type === 'District' && s.lat && s.lng
  )
  console.log(`${washoeDistrict.length} Washoe District schools with coordinates`)

  // Load Washoe zones from combined GeoJSON
  const washoeData = JSON.parse(readFileSync(join(dataDir, 'wcsd-school-zones.geojson'), 'utf8'))
  console.log(`wcsd-school-zones.geojson: ${washoeData.features.length} zones`)

  const washoeZones = washoeData.features
  for (const f of washoeZones) {
    f._level = f.properties._level
  }

  // Build school index by level (include "Other" as candidates too)
  const washoeByLevel = {}
  for (const school of washoeDistrict) {
    if (!washoeByLevel[school.level]) washoeByLevel[school.level] = []
    washoeByLevel[school.level].push(school)
  }
  const washoeOther = schools.filter(
    s => s.county === 'Washoe' && s.type === 'District' && s.level === 'Other' && s.lat && s.lng
  )

  // Match Washoe zones
  const washoeAssigned = new Set()
  const washoeMatched = []
  const washoeUnmatched = []

  for (const zone of washoeZones) {
    if (!zone.geometry) {
      console.warn(`  Skipping zone with no geometry: ${zone.properties?.NAME}`)
      continue
    }

    const level = zone._level
    const candidates = [
      ...(washoeByLevel[level] || []),
      ...washoeOther,
    ].filter(s => !washoeAssigned.has(s.id))

    const match = matchWashoeZone(zone, candidates, schools)

    if (match && !washoeAssigned.has(match.id)) {
      washoeAssigned.add(match.id)
      washoeMatched.push(createOutputFeature(match, simplifyFeature(zone)))
    } else {
      washoeUnmatched.push({ name: zone.properties?.NAME, level })
    }
  }

  console.log(`Matched: ${washoeMatched.length}, Unmatched: ${washoeUnmatched.length}`)

  // ========== OUTPUT ==========
  const geojson = {
    type: 'FeatureCollection',
    features: [...clarkMatched, ...washoeMatched],
  }

  const outPath = join(dataDir, 'nv-school-zones.geojson')
  writeFileSync(outPath, JSON.stringify(geojson))

  const fileSizeKB = Math.round(Buffer.byteLength(JSON.stringify(geojson)) / 1024)

  // Report
  console.log(`\n=== Combined Report ===`)
  console.log(`Clark features:  ${clarkMatched.length}`)
  console.log(`Washoe features: ${washoeMatched.length}`)
  console.log(`Total features:  ${geojson.features.length}`)
  console.log(`File size:       ${fileSizeKB} KB`)
  console.log(`Output: ${outPath}`)

  if (clarkUnmatched.length > 0) {
    console.log(`\nUnmatched Clark boundaries (${clarkUnmatched.length}):`)
    for (const b of clarkUnmatched) {
      console.log(`  [${b.level}] SCHOOL="${b.name}" FULLNAME="${b.fullName}"`)
    }
  }

  if (washoeUnmatched.length > 0) {
    console.log(`\nUnmatched Washoe zones (${washoeUnmatched.length}):`)
    for (const z of washoeUnmatched) {
      console.log(`  [${z.level}] NAME="${z.name}"`)
    }
  }

  // Schools with no zone
  const allMatchedIds = new Set(geojson.features.map(f => f.properties.schoolId))

  const clarkNoZone = clarkDistrict.filter(s => !allMatchedIds.has(s.id))
  if (clarkNoZone.length > 0) {
    console.log(`\nClark District schools with no zone (${clarkNoZone.length}):`)
    for (const s of clarkNoZone) {
      console.log(`  [${s.level}] ${s.name} (${s.id})`)
    }
  }

  const washoeNoZone = washoeDistrict.filter(s => !allMatchedIds.has(s.id))
  if (washoeNoZone.length > 0) {
    console.log(`\nWashoe District schools with no zone (${washoeNoZone.length}):`)
    for (const s of washoeNoZone) {
      console.log(`  [${s.level}] ${s.name} (${s.id})`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
