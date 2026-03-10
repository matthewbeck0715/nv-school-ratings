import { readFileSync, writeFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'public', 'data')

const EXCLUDED_TYPES = new Set(['Alternative', 'Correctional', 'Juvenile Correctional', 'Special Education', 'University'])

function inferLevel(name) {
  const n = name.toUpperCase()
  if (n.includes('K8') || n.includes('K-8')) return 'Other'
  if (/ ES$/.test(name)) return 'Elementary'
  if (/ MS$/.test(name)) return 'Middle'
  if (/ HS$/.test(name)) return 'High'
  return 'Other'
}

function parseNum(val) {
  if (val == null) return null
  const s = String(val).trim()
  if (s === '' || s === 'N/A' || s === '-') return null
  if (s === '<5') return 5
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseBool(val) {
  return String(val).trim().toUpperCase() === 'YES'
}

function parseStarRating(val) {
  const s = String(val).trim()
  const n = parseInt(s, 10)
  if (n >= 1 && n <= 5) return n
  return null
}

function loadCsv(filePath) {
  const content = readFileSync(filePath, 'utf8')
  return parse(content, { columns: true, skip_empty_lines: true, trim: true })
}

// --- Step A: Load CSVs ---
const ratingsRows = loadCsv(join(dataDir, 'nv-school-ratings.csv'))
const locationRows = loadCsv(join(dataDir, 'nv-school-locations.csv'))

// --- Step B: Build location lookups ---
// By exact lowercase name
const locationByName = {}
for (const loc of locationRows) {
  if (loc.NAME) locationByName[loc.NAME.trim().toLowerCase()] = loc
}

// By county (NMCNTY stripped of " County" suffix)
const locationsByCounty = {}
for (const loc of locationRows) {
  const county = (loc.NMCNTY?.trim() || '').replace(/ County$/, '')
  if (!locationsByCounty[county]) locationsByCounty[county] = []
  locationsByCounty[county].push(loc)
}

// --- Step C: Manual map (ratings name → NCES name) ---
const MANUAL_MAP = {
  // Carson City
  'Carson Montessori ES': 'Carson Montessori',
  // Clark
  'Adv Tech ACAD HS': 'Advanced Technologies Academy HS',
  'Burkholder MS': 'Burkholder Lyal Academy of Environmental Science',
  'Clark HS': 'Clark Ed W HS',
  'CSN East HS': 'College of So NV HS East',
  'CSN South HS': 'College of So NV HS South',
  'CSN West HS': 'College of So NV HS West',
  'CTTA HS': 'Central Technical Training Academy',
  'ECTA HS': 'East Career and Technical Academy HS',
  'Expl Knowledge ES': 'Explore Knowledge Academy ES',
  'Expl Knowledge SEC HS': 'Explore Knowledge Academy J-SHS',
  'Expl Knowledge SEC MS': 'Explore Knowledge Academy J-SHS',
  'Gibson MS': 'Gibson Robert O MS Leadership Academy',
  'Johnston MS': 'Johnston Carroll M STEM Academy of Env Studies',
  'Knudson MS': 'Knudson K O Academy of the Arts',
  'Las Vegas ACAD HS': 'Las Vegas Academy of the Arts HS',
  'Mack MS': 'Lyon Mack MS',
  'NECTA HS': 'Northeast Career and Technical Academy HS',
  'NV LRN ACAD ES': 'NV Learning Academy ES',
  'NV LRN Academy HS': 'NV Learning Academy J-SHS',
  'NV LRN Academy MS': 'NV Learning Academy J-SHS',
  'NWCTA ES': 'Northwest Career-Technical Academy HS',
  'NWCTA HS': 'Northwest Career-Technical Academy HS',
  'OCallaghan i3 ACAD MS': "O'Callaghan Mike MS i3 Learn Academy",
  'ORoarke ES': 'O Roarke Thomas ES',
  'Perkins C ES': 'Perkins Dr Claude G ES',
  'Rainbow Dreams ELA ES': 'Rainbow Dreams Early Learning Academy',
  'SECTA HS': 'Southeast Career Technical Academy HS',
  'SWCTA HS': 'Southwest Career & Technical Academy HS',
  'Thomas ES': 'Thomas Ruby S ES',
  'Thompson ES': 'Thompson Sandra L ES',
  'Toland ES': 'Toland Helen Anderson Intl Academy',
  'VTCTA HS': 'Veterans Tribute CTA HS',
  'WCTA HS': 'West Career & Technical Academy HS',
  'West Prep JSHS HS': 'West Preparatory Institute J-SHS',
  // Douglas
  'Whittell MS': 'George Whittell High School',
  // Elko
  'Carlin HS': 'Carlin High School',
  'Elko Grammar ES': 'Grammar School 2',
  'Flagview Intermediate ES': 'Flagview Intermediate School',
  'Jackpot HS': 'Jackpot High School',
  'Mound Valley MS': 'Mound Valley Elementary School',
  'Mtn View ES': 'Mountain View ES',
  'NE NV Virtual ES': 'Northeastern Nevada Virtual Academy',
  'NE NV Virtual HS': 'Northeastern Nevada Virtual Academy',
  'NE NV Virtual MS': 'Northeastern Nevada Virtual Academy',
  'Owyhee HS': 'Owyhee High School',
  'Ruby Valley MS': 'Ruby Valley Elementary School',
  'Wells HS': 'Wells High School',
  // Esmeralda
  'Dyer MS': 'Dyer Elementary School',
  'Goldfield MS': 'Goldfield Elementary School',
  'Silver Peak MS': 'Silver Peak Elementary School',
  // Eureka
  'Eureka MS': 'Eureka County High School',
  // Humboldt
  'Denio ES': 'Denio',
  'French Ford ES': 'French Ford Middle School',
  'Kings River ES': 'Kings River',
  'Kings River MS': 'Kings River',
  'McDermitt HS': 'McDermitt High School',
  'Orovada ES': 'Orovada School',
  'Orovada MS': 'Orovada School',
  'Paradise Valley ES': 'Paradise Valley School',
  'Paradise Valley MS': 'Paradise Valley School',
  // Lander
  'Austin Combined ES': 'Austin Combined Schools',
  'Austin Combined MS': 'Austin Combined Schools',
  // Lyon
  'Dayton Intermediate MS': 'Dayton Intermediate School',
  'Smith Valley Combined ES': 'Smith Valley Schools',
  'Smith Valley Combined HS': 'Smith Valley Schools',
  'Smith Valley Combined MS': 'Smith Valley Schools',
  'Yerington Intermediate MS': 'Yerington Intermediate School',
  // Washoe
  'ACE ACAD HS': 'Academy For Career Education',
  'Arts Careers Tech HS': 'ACADEMY OF ARTS CAREERS & TECH',
  'Bailey CH ES': 'Bailey Charter School',
  'Clayton Academy MS': 'ARCHIE CLAYTON PRE-A.P. ACADEMY',
  'Coral Acad ES': 'Coral Academy Elementary',
  'Coral Acad-Northwest ES': 'Coral Academy Elementary-Northwest',
  'Coral Acad-South ES': 'Coral Academy Elementary-South',
  'Dilworth MS': 'GEORGE L. DILWORTH S.T.E.M ACADEMY',
  'Duncan ES': 'GLENN DUNCAN S.T.E.M. ACADEMY',
  'enCompass CS HS': 'enCompass Academy',
  'Gerlach K 12 ES': 'GERLACH K-12 SCHOOL',
  'Gerlach K 12 MS': 'GERLACH K-12 SCHOOL',
  'High Desert CS ES': 'High Desert Montessori',
  'High Desert CS MS': 'High Desert Montessori',
  'Mariposa CS ES': 'Mariposa Language and Learning Academy',
  'Mount Rose K-8 ES': 'MOUNT ROSE K-8 ACADEMY OF LANGUAGES',
  'Mount Rose K-8 MS': 'MOUNT ROSE K-8 ACADEMY OF LANGUAGES',
  'Sierra NV Acad CS ES': 'Sierra Nevada Academy Charter',
  'Sierra NV Acad CS MS': 'Sierra Nevada Academy Charter',
  'Smithridge ES': 'SMITHRIDGE S.T.E.M. ACADEMY',
  'TMCC Magnet HS': 'TMCC MAGNET SCHOOL',
  'Veterans Memorial STEM ES': 'VETERANS MEMORIAL S.T.E.M. ACADEMY',
  // White Pine
  'Lund JSHS MS': 'Lund High School',
  // SPCSA
  'Alpine Acad HS': 'Alpine Academy High School',
  'Battle Born Charter ES': 'Battle Born Academy',
  'Battle Born Charter MS': 'Battle Born Academy',
  'Beacon ACAD HS': 'Beacon Academy of Nevada',
  'CASLV Cadence ES': 'Coral Academy Cadence',
  'CASLV Cadence HS': 'Coral Academy Cadence',
  'CASLV Cadence MS': 'Coral Academy Cadence',
  'CASLV Centennial ES': 'Coral Academy Centennial Hills',
  'CASLV Centennial MS': 'Coral Academy Centennial Hills',
  'CASLV Eastgate ES': 'Coral Academy Eastgate',
  'CASLV Nellis AFB ES': 'Coral Academy Nellis AFB',
  'CASLV Nellis AFB MS': 'Coral Academy Nellis AFB',
  'CASLV Sandy Ridge HS': 'Coral Academy Sandy Ridge',
  'CASLV Sandy Ridge MS': 'Coral Academy Sandy Ridge',
  'CASLV Tamarus ES': 'Coral Academy Tamarus',
  'CASLV Windmill ES': 'Coral Academy Windmill',
  'CASLV Windmill MS': 'Coral Academy Windmill',
  'CIVICA Acad ES': 'CIVICA Academy',
  'CIVICA Acad HS': 'CIVICA Academy',
  'CIVICA Acad MS': 'CIVICA Academy',
  'Discovery Hill Pointe ES': 'Discovery Charter School HillPointe',
  'Discovery Hill Pointe MS': 'Discovery Charter School HillPointe',
  'Discovery Sandhill ES': 'Discovery Charter School Sandhill',
  'Doral Cactus  ES': 'Doral Academy Cactus',
  'Doral Cactus  MS': 'Doral Academy Cactus',
  'Doral Fire Mesa ES': 'Doral Academy Fire Mesa',
  'Doral Fire Mesa MS': 'Doral Academy Fire Mesa',
  'Doral Northern NV ES': 'Doral Academy of Northern Nevada',
  'Doral Northern NV MS': 'Doral Academy of Northern Nevada',
  'Doral Red Rock ES': 'Doral Academy Red Rock',
  'Doral Red Rock HS': 'Doral Academy Red Rock',
  'Doral Red Rock MS': 'Doral Academy Red Rock',
  'Doral Saddle ES': 'Doral Academy Saddle',
  'Doral Saddle MS': 'Doral Academy Saddle',
  'Doral W Pebble ES': 'Doral Academy West Pebble',
  'Doral W Pebble MS': 'Doral Academy West Pebble',
  'DP Agassi  HS': 'Democracy Prep at Agassi High',
  'DP Agassi ES': 'Democracy Prep at Agassi Elementary',
  'DP Agassi MS': 'Democracy Prep at Agassi Middle',
  'Elko Institute ES': 'Elko Institute for Academic Achievement',
  'Elko Institute MS': 'Elko Institute for Academic Achievement',
  'Equipo ACAD HS': 'Equipo Academy',
  'Equipo ACAD MS': 'Equipo Academy',
  'Explore ACAD HS': 'Explore Academy',
  'Explore ACAD MS': 'Explore Academy',
  'Founders ACAD ES': 'Founders Academy of Las Vegas',
  'Founders ACAD HS': 'Founders Academy of Las Vegas',
  'Founders ACAD MS': 'Founders Academy of Las Vegas',
  'Freedom Class ACAD ES': 'Freedom Classical Academy K-8',
  'Freedom Class ACAD MS': 'Freedom Classical Academy K-8',
  'Futuro ACAD ES': 'Futuro Academy Elementary',
  'Honors ACAD ES': 'Honors Academy of Literature',
  'Honors ACAD MS': 'Honors Academy of Literature',
  'Imagine Mtn View ES': 'Imagine School Mountain View',
  'Imagine Mtn View MS': 'Imagine School Mountain View',
  'Leadership ACAD HS': 'Leadership Academy of Nevada',
  'Leadership ACAD MS': 'Leadership Academy of Nevada',
  'Legacy Cadence ES': 'Legacy Traditional School Cadence',
  'Legacy Cadence MS': 'Legacy Traditional School Cadence',
  'Legacy N Valley ES': 'Legacy Traditional School North Valley',
  'Legacy N Valley MS': 'Legacy Traditional School North Valley',
  'Legacy SW ES': 'Legacy Traditional School Southwest Las Vegas',
  'Legacy SW MS': 'Legacy Traditional School Southwest Las Vegas',
  'Mater East ES': 'Mater Academy East',
  'Mater East HS': 'Mater Academy East',
  'Mater East MS': 'Mater Academy East',
  'Mater Mtn Vista  ES': 'Mater Mountain Vista',
  'Mater Mtn Vista  MS': 'Mater Mountain Vista',
  'Mater Northern NV ES': 'Mater Academy of Northern Nevada',
  'Mater Northern NV MS': 'Mater Academy of Northern Nevada',
  'Nevada Virtual HS': 'Nevada Virtual Charter School',
  'Nevada Virtual MS': 'Nevada Virtual Charter School',
  'NSHS Downtown HS': 'Nevada State High School Downtown',
  'NSHS DownTwn Hend HS': 'Nevada State High School Downtown Henderson',
  'NSHS Henderson HS': 'Nevada State High School Henderson',
  'NSHS II Meadowwood HS': 'Nevada State High School II Meadowwood',
  'NSHS North Las Vegas HS': 'Nevada State High School North Las Vegas',
  'NSHS NW HS': 'Nevada State High School Northwest',
  'NSHS Summerlin HS': 'Nevada State High School Summerlin',
  'NSHS Sunrise HS': 'Nevada State High School Sunrise',
  'NSHS SW HS': 'Nevada State High School Southwest',
  'NV Connections ACAD HS': 'Nevada Connections Academy',
  'NV Prep CS ES': 'Nevada Prep Charter School',
  'NV Prep CS MS': 'Nevada Prep Charter School',
  'NV Rise CS ES': 'NV Rise Academy Charter School',
  'Oasis ACAD ES': 'Oasis Academy',
  'Oasis ACAD HS': 'Oasis Academy',
  'Oasis ACAD MS': 'Oasis Academy',
  'Pinecrest Cadence ES': 'Pinecrest Academy of Nevada Cadence',
  'Pinecrest Cadence HS': 'Pinecrest Academy of Nevada Cadence',
  'Pinecrest Cadence MS': 'Pinecrest Academy of Nevada Cadence',
  'Pinecrest Horizon ES': 'Pinecrest Academy of Nevada Horizon',
  'Pinecrest Inspirada ES': 'Pinecrest Academy of Nevada Inspirada',
  'Pinecrest Inspirada MS': 'Pinecrest Academy of Nevada Inspirada',
  'Pinecrest Northern NV ES': 'Pinecrest Academy of Northern Nevada',
  'Pinecrest Northern NV MS': 'Pinecrest Academy of Northern Nevada',
  'Pinecrest Sloan ES': 'Pinecrest Academy of Nevada Sloan Canyon',
  'Pinecrest Sloan HS': 'Pinecrest Academy of Nevada Sloan Canyon',
  'Pinecrest Sloan MS': 'Pinecrest Academy of Nevada Sloan Canyon',
  'Pinecrest Springs ES': 'Pinecrest Academy of Nevada Springs',
  'Pinecrest St Rose ES': 'Pinecrest Academy of Nevada St Rose',
  'Pinecrest St Rose MS': 'Pinecrest Academy of Nevada St Rose',
  'Pinecrest Virtual HS': 'Pinecrest Academy of Nevada Virtual',
  'Pinecrest Virtual MS': 'Pinecrest Academy of Nevada Virtual',
  'Quest Northwest ES': 'Quest Academy Northwest',
  'Quest Northwest MS': 'Quest Academy Northwest',
  'Sage Collegiate ES': 'Sage Collegiate Public Charter School',
  'Sage Collegiate MS': 'Sage Collegiate Public Charter School',
  'Signature Prep CS ES': 'Signature Preparatory',
  'Signature Prep CS MS': 'Signature Preparatory',
  'Silver Sands ES': 'Silver Sands Montessori',
  'Silver Sands MS': 'Silver Sands Montessori',
  'SLAM ES': 'Sports Leadership and Management Academy',
  'SLAM HS': 'Sports Leadership and Management Academy',
  'SLAM MS': 'Sports Leadership and Management Academy',
  'Somerset Aliante ES': 'Somerset Academy Aliante',
  'Somerset Aliante MS': 'Somerset Academy Aliante',
  'Somerset Lone Mtn ES': 'Somerset Academy Lone Mountain',
  'Somerset Lone Mtn MS': 'Somerset Academy Lone Mountain',
  'Somerset Losee ES': 'Somerset Academy Losee',
  'Somerset Losee HS': 'Somerset Academy Losee',
  'Somerset Losee MS': 'Somerset Academy Losee',
  'Somerset NLV ES': 'Somerset Academy North Las Vegas',
  'Somerset Sky Pointe ES': 'Somerset Academy Sky Pointe',
  'Somerset Sky Pointe HS': 'Somerset Academy Sky Pointe',
  'Somerset Sky Pointe MS': 'Somerset Academy Sky Pointe',
  'Somerset Skye Canyon ES': 'Somerset Academy Skye Canyon',
  'Somerset Skye Canyon MS': 'Somerset Academy Skye Canyon',
  'Somerset Stephanie ES': 'Somerset Academy Stephanie',
  'Somerset Stephanie MS': 'Somerset Academy Stephanie',
  'Southern NV Trades HS': 'Southern Nevada Trades High School',
  'Thrive Point Acad HS': 'Thrive Point Academy',
  'Vegas Vista Acad ES': 'Vegas Vista Academy',
  'YWLA HS': "Young Women's Leadership Academy of Las Vegas",
  'YWLA MS': "Young Women's Leadership Academy of Las Vegas",
}

// --- Step D: Auto-match helpers ---

// Returns true if the NCES school name matches the given rating level suffix (ES/MS/HS)
function ncesMatchesLevel(ncesName, suffix) {
  const n = ncesName.toUpperCase()
  if (suffix === 'ES') {
    return (/ ES$/.test(ncesName) || n.includes('ELEMENTARY') || n.includes('GRAMMAR'))
      && !/ HS$/.test(ncesName) && !n.includes('HIGH')
      && !/ MS$/.test(ncesName) && !n.includes('MIDDLE') && !/\bJHS\b/.test(n)
  }
  if (suffix === 'MS') {
    return / MS$/.test(ncesName) || /\bJHS\b/.test(n) || n.includes('MIDDLE')
      || / J-SHS$/.test(ncesName) || n.includes('JR HIGH') || n.includes('JUNIOR HIGH')
  }
  if (suffix === 'HS') {
    return / HS$/.test(ncesName) || n.includes('HIGH SCHOOL') || / J-SHS$/.test(ncesName)
  }
  return true
}

// For regular public schools: match by first meaningful word + county + level.
// If multiple candidates remain, try to narrow down using the second token (initial or full name).
// Returns the location row only when exactly one NCES school matches — otherwise null.
function autoMatch(ratingsName, district) {
  if (!district) return null

  // For SPCSA: strip level suffix and try exact lookup (NCES names typically omit ES/MS/HS)
  if (district === 'State Public Charter School Authority') {
    const suffixMatch = ratingsName.match(/ (ES|MS|HS)$/)
    if (!suffixMatch) return null
    const baseName = ratingsName.slice(0, -suffixMatch[0].length).trim()
    return locationByName[baseName.toLowerCase()] ?? null
  }

  const suffixMatch = ratingsName.match(/ (ES|MS|HS)$/)
  if (!suffixMatch) return null
  const suffix = suffixMatch[1]

  const baseName = ratingsName.slice(0, -suffixMatch[0].length).trim()
  const tokens = baseName.split(/\s+/)
  // Find first token longer than 2 chars — short tokens like "T", "D", "JG" are initials
  const keyWord = tokens.find(t => t.length > 2)
  if (!keyWord) return null

  const countyLocs = locationsByCounty[district] || []
  if (!countyLocs.length) return null

  // Word-boundary match to avoid "Ellis" matching "Nellis", etc.
  const re = new RegExp('\\b' + keyWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
  const candidates = countyLocs.filter(loc => re.test(loc.NAME) && ncesMatchesLevel(loc.NAME, suffix))

  if (candidates.length === 1) return candidates[0]

  // Multiple candidates: try second token to disambiguate
  if (candidates.length > 1) {
    const secondToken = tokens[tokens.indexOf(keyWord) + 1]
    if (!secondToken) return null

    let refined
    if (secondToken.length === 1) {
      // Single-letter initial — find the word immediately after keyWord in the NCES name and check its first letter
      refined = candidates.filter(loc => {
        const afterKey = loc.NAME.slice(loc.NAME.toLowerCase().indexOf(keyWord.toLowerCase()) + keyWord.length).trimStart()
        const nextWord = afterKey.split(/\s+/)[0] || ''
        return nextWord.toUpperCase().startsWith(secondToken.toUpperCase())
      })
    } else {
      // Full word — check if NCES name contains it
      const wordRe = new RegExp('\\b' + secondToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
      refined = candidates.filter(loc => wordRe.test(loc.NAME))
    }

    if (refined.length === 1) return refined[0]
  }

  return null
}

// --- Step E: Process ratings rows ---
const schools = []
let exactMatched = 0, manualMatched = 0, autoMatched = 0, filtered = 0, unmatched = 0

for (const row of ratingsRows) {
  const type = row['School Type'].trim()
  if (EXCLUDED_TYPES.has(type)) { filtered++; continue }

  const indexScore = parseNum(row['Total Index Score'])
  if (indexScore === null) { filtered++; continue }

  const name = row['School Name'].trim()
  const district = row['District Name']?.trim()
  const schoolType = type === 'District Charter' || type === 'SPCSA' ? 'Charter' : 'Regular'
  const level = inferLevel(name)

  // 1. Exact name match
  let loc = locationByName[name.toLowerCase()] ?? null
  if (loc) {
    exactMatched++
  } else if (MANUAL_MAP[name]) {
    // 2. Manual map lookup
    loc = locationByName[MANUAL_MAP[name].toLowerCase()] ?? null
    if (loc) manualMatched++
  } else {
    // 3. Auto-match: first meaningful word + county + level
    loc = autoMatch(name, district)
    if (loc) autoMatched++
  }

  let lat = null, lng = null, address = null, city = null, zip = null, county = null

  if (loc) {
    lat = parseFloat(loc.LAT) || null
    lng = parseFloat(loc.LON) || null
    address = loc.STREET?.trim() || null
    city = loc.CITY?.trim() || null
    zip = loc.ZIP?.trim() || null
    county = (loc.NMCNTY?.trim() || '').replace(/ County$/, '') || null
  } else {
    unmatched++
    if (district && district !== 'State Public Charter School Authority') county = district
  }

  schools.push({
    id: row['NSPF School Code'].trim(),
    name,
    type: schoolType,
    level,
    county,
    starRating: parseStarRating(row['Star Rating']),
    indexScore,
    elaProficiency: parseNum(row['% Proficient ELA']),
    mathProficiency: parseNum(row['% Proficient Math']),
    scienceProficiency: parseNum(row['% Proficient Science']),
    elaGrowth: parseNum(row['% Meeting AGP ELA']),
    mathGrowth: parseNum(row['% Meeting AGP Math']),
    titleI: parseBool(row['Title I Status']),
    lat,
    lng,
    address,
    city,
    zip,
  })
}

// --- Step F: Output ---
writeFileSync(join(dataDir, 'nv-schools.json'), JSON.stringify(schools, null, 2))

console.log(`Done. Kept: ${schools.length}, Filtered: ${filtered}`)
console.log(`  Exact match: ${exactMatched}, Manual: ${manualMatched}, Auto-match: ${autoMatched}, Unmatched: ${unmatched}`)
