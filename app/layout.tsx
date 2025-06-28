import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          {children}
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
