import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tiny CMS Blog',
  description: 'A simple blog built with Tiny CMS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
