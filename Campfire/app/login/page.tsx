"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, ArrowLeft, Wallet } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { WalletConnect } from "@/components/wallet-connect"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Flame className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
              <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-fade-in">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to Campfire</CardTitle>
            <CardDescription>Connect your Slush Wallet to access your profile and badges</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <WalletConnect />

            <div className="w-full pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center mb-3">Don't have a Slush Wallet?</p>
              <p className="text-xs text-muted-foreground text-center">
                Download the Slush Wallet extension for Chrome or Firefox to get started with SUI blockchain.
              </p>
            </div>

            <div className="w-full">
              <Link href="/">
                <Button variant="ghost" className="w-full gap-2 transition-all duration-200 hover:translate-x-1">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Landing Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
