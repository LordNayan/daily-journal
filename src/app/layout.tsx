import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://daily-journal-blond-chi.vercel.app'),
  title: 'Convosight · Daily Journal',
  description: 'Convosight team daily journal — radical transparency',
  openGraph: {
    title: 'Convosight P&T · Daily Journal',
    description: 'P&T daily journal',
    images: [{ url: '/company_logo.png', width: 512, height: 512, alt: 'Convosight' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
