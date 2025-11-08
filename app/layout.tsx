import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { WalletProviders } from "@/lib/wallet-provider"
import { AuthProvider } from "@/lib/auth-context"
import { CleanupServiceWorker } from "@/components/cleanup-service-worker"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"] })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Campfire - Digital Badge Platform",
  description: "Recognize achievement, build community with digital badges",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased ${_inter.className}`}>
        <WalletProviders>
          <ThemeProvider defaultTheme="light">
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </WalletProviders>
        <Analytics />
        <CleanupServiceWorker />
      </body>
    </html>
  )
}
