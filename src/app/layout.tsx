import type { Metadata, Viewport } from 'next'
import './globals.css'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const metadata: Metadata = {
  metadataBase: new URL('https://nevadaschoolratings.com'),
  title: 'Nevada School Rating',
  description:
    'Explore Nevada school star ratings, performance data, and school zone information. Search, filter, and compare schools across the state with interactive maps and tables.',
  keywords: [
    'Nevada school ratings',
    'Nevada school star ratings',
    'Nevada school performance',
    'NV school ratings',
    'Nevada education data',
    'school star ratings Nevada',
    'Nevada school zones',
    'Clark County schools',
    'Washoe County schools',
  ],
  icons: { icon: `${basePath}/favicon.svg` },
  alternates: {
    canonical: 'https://nevadaschoolratings.com',
  },
  openGraph: {
    title: 'Nevada School Ratings — Star Ratings & Performance Data',
    description:
      'Explore Nevada school star ratings, performance data, and school zone information. Search, filter, and compare schools across the state.',
    type: 'website',
    url: 'https://nevadaschoolratings.com',
    siteName: 'Nevada School Ratings',
  },
  twitter: {
    card: 'summary',
    title: 'Nevada School Ratings — Star Ratings & Performance Data',
    description:
      'Explore Nevada school star ratings, performance data, and school zone information. Search, filter, and compare schools across the state.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'Nevada School Ratings',
      url: 'https://nevadaschoolratings.com',
      description:
        'Explore Nevada school star ratings, performance data, and school zone information.',
    },
    {
      '@type': 'Dataset',
      name: 'Nevada School Performance Ratings',
      description:
        'Star ratings and performance data for public, charter, and alternative schools across Nevada.',
      url: 'https://nevadaschoolratings.com',
      keywords: [
        'Nevada schools',
        'school ratings',
        'star ratings',
        'school performance',
        'education data',
      ],
      license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
