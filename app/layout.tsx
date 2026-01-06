import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import SiteNavbar from "@/components/site-navbar"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Fetch current user on the server and pass to navbar to avoid client libs
  let me: any = null
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/auth/me`, {
      cache: "no-store",
      headers: { "content-type": "application/json" },
    })
    if (res.ok) {
      me = await res.json()
    }
  } catch {
    // ignore - unauthenticated or network issue
  }

  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} antialiased`}>
      <body className="font-sans">
        <Suspense fallback={<div>Loading...</div>}>
          <header className="border-b border-border">
            <SiteNavbar initialMe={me} />
          </header>
          <main className="container mx-auto px-4 py-6">{children}</main>
        </Suspense>
      </body>
    </html>
  )
}
