import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import simplify from '@turf/simplify'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

function truncateCoords(coords, precision = 4) {
  if (typeof coords[0] === 'number') {
    return coords.map(c => parseFloat(c.toFixed(precision)))
  }
  return coords.map(ring => truncateCoords(ring, precision))
}

function main() {
  console.log('Reading us-counties.geojson...')
  const allCounties = JSON.parse(readFileSync(join(dataDir, 'us-counties.geojson'), 'utf8'))

  // Filter to Nevada (STATEFP = '32')
  const nvFeatures = allCounties.features.filter(f => f.properties.STATEFP === '32')
  console.log(`Found ${nvFeatures.length} Nevada counties`)

  const features = nvFeatures.map(feature => {
    // Simplify geometry (coarser tolerance for low-zoom display)
    let geometry
    try {
      const simplified = simplify(feature, { tolerance: 0.01, highQuality: false, mutate: false })
      geometry = {
        ...simplified.geometry,
        coordinates: truncateCoords(simplified.geometry.coordinates),
      }
    } catch {
      geometry = {
        ...feature.geometry,
        coordinates: truncateCoords(feature.geometry.coordinates),
      }
    }

    // Carson City is an independent city (GEOID 32510), ensure NAME matches COUNTY_VIEWS key
    const name = feature.properties.GEOID === '32510'
      ? 'Carson City'
      : feature.properties.NAME

    return {
      type: 'Feature',
      properties: { NAME: name },
      geometry,
    }
  })

  const geojson = {
    type: 'FeatureCollection',
    features,
  }

  const outPath = join(dataDir, 'nv-counties.geojson')
  writeFileSync(outPath, JSON.stringify(geojson))

  const fileSizeKB = Math.round(Buffer.byteLength(JSON.stringify(geojson)) / 1024)
  console.log(`\nWrote ${features.length} county boundaries`)
  console.log(`File size: ${fileSizeKB} KB`)
  console.log(`Output: ${outPath}`)

  // List all county names
  console.log('\nCounties:')
  for (const f of features.sort((a, b) => a.properties.NAME.localeCompare(b.properties.NAME))) {
    console.log(`  ${f.properties.NAME}`)
  }
}

main()
