import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JamiCore — Multi-Tenant E-Commerce',
  description: 'Next-gen e-commerce SaaS platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  )
}
