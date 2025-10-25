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
    if (!isLoading && !user && !currentAccount) {
      router.push("/login")
    }
  }, [user, isLoading, currentAccount, router])

  if (isLoading || (currentAccount && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user && !currentAccount) {
    return null
  }

  return <>{children}</>
}
