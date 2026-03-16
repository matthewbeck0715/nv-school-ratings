# Nevada School Ratings

A mobile-friendly data visualization tool for Nevada public school performance data. Browse all rated schools on an interactive map or sortable table, and filter by name, location, star rating, school level, type, and county.

**Live site:** https://nevadaschoolratings.com/

## Features

- **Map view** — color-coded markers (red → green) by star rating; click a marker to see a school popup with address, scores, and a Google Maps link
- **Table view** — sortable, paginated list of all 776 rated schools; click a school name to fly to it on the map
- **Filters** — search by name, proximity search by address, county dropdown, school level (Elementary / Middle / High), school type (District / Charter), and star rating (1–5 or Not Rated)
- **Star rating colors** — NR gray, 1★ red, 2★ orange, 3★ yellow, 4★ light green, 5★ green

## Data

Performance data comes from the Nevada Department of Education's [Star Rating system](https://nevadareportcard.nv.gov). Location data (coordinates, addresses) is sourced from the NCES Common Core of Data.

The build script (`scripts/build-school-data.mjs`) joins the two sources and outputs `public/data/nv-school-data.json`.

## Development

```bash
npm install
npm run dev          # Dev server at localhost:3000
npm run build        # Static export to ./out
npm run lint         # ESLint
```

For a production-accurate local preview (matches GitHub Pages paths):

```bash
NODE_ENV=production NEXT_PUBLIC_BASE_PATH=/nv-school-ratings npm run build
npx serve out
```

To regenerate the school data after updating source CSVs:

```bash
node scripts/build-school-data.mjs
```

## Stack

- [Next.js 15](https://nextjs.org) (App Router, static export)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) via [react-leaflet](https://react-leaflet.js.org)
- Deployed to [GitHub Pages](https://pages.github.com) via GitHub Actions
