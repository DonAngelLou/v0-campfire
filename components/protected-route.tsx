"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useCurrentAccount } from "@mysten/dapp-kit"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const currentAccount = useCurrentAccount()
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] ProtectedRoute state:", {
      isLoading,
      hasUser: !!user,
      hasCurrentAccount: !!currentAccount,
      userWallet: user?.wallet_address,
      accountAddress: currentAccount?.address,
    })
  }, [isLoading, user, currentAccount])

  useEffect(() => {
    if (!isLoading && !currentAccount) {
      console.log("[v0] No wallet connected, redirecting to login")
      router.push("/login")
    }
  }, [isLoading, currentAccount, router])

  if (isLoading) {
    console.log("[v0] Auth still loading...")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!currentAccount) {
    console.log("[v0] No current account, returning null")
    return null
  }

  console.log("[v0] ProtectedRoute rendering children")
  return <>{children}</>
}
