import type { Metadata, Viewport } from 'next'
import './globals.css'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export const metadata: Metadata = {
  metadataBase: new URL('https://nevadaschoolratings.com'),
  title: 'Nevada School Ratings',
  description:
    'An interactive map for visualizing Nevada school ratings.',
  keywords: [
    'Nevada school ratings',
    'Nevada school map',
    'Nevada school star ratings',
    'Nevada school performance',
    'NV school ratings',
    'NV school map',
    'Nevada education data',
    'school star ratings Nevada',
    'Nevada school zones',
    'Clark County schools',
    'Washoe County schools',
    'Nevada school rating methodology',
    'about Nevada school ratings',
  ],
  icons: { icon: `${basePath}/favicon.svg` },
  alternates: {
    canonical: 'https://nevadaschoolratings.com',
  },
  openGraph: {
    title: 'Nevada School Ratings — Star Ratings & Performance Data',
    description:
      'An interactive map for visualizing Nevada school ratings.',
    type: 'website',
    url: 'https://nevadaschoolratings.com',
    siteName: 'Nevada School Ratings',
  },
  twitter: {
    card: 'summary',
    title: 'Nevada School Ratings — Star Ratings & Performance Data',
    description:
      'An interactive map for visualizing Nevada school ratings.',
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
        'An interactive map for visualizing Nevada school ratings.',
    },
    {
      '@type': 'Dataset',
      name: 'Nevada School Performance Ratings',
      description:
        'Star ratings and performance data for Nevada public schools.',
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
