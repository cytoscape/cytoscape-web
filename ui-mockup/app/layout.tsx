import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: 'Cytoscape Web · UI study',
  description: 'Interactive, isolated Cytoscape Web design prototype.',
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
