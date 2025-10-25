"use client"

import { useCurrentAccount, useDisconnectWallet, useSignPersonalMessage } from "@mysten/dapp-kit"
import { useEffect, useState, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase-client"

interface User {
  wallet_address: string
  sui_wallet_address: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: "user" | "organizer"
  wallet_type: string
  created_at: string
}

export function useWalletAuth() {
  const currentAccount = useCurrentAccount()
  const { mutate: disconnect } = useDisconnectWallet()
  const { mutateAsync: signMessage } = useSignPersonalMessage()

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const hasAttemptedAuth = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      const storedWallet = localStorage.getItem("campfire_sui_wallet")
      if (storedWallet && currentAccount?.address === storedWallet) {
        await fetchUser(storedWallet)
      } else {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, []) // Empty dependency array - run only once on mount

  useEffect(() => {
    if (currentAccount && !user && !isAuthenticating && !hasAttemptedAuth.current) {
      hasAttemptedAuth.current = true
      authenticateUser()
    }
  }, [currentAccount]) // Only depend on currentAccount, not user

  const fetchUser = async (walletAddress: string) => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("users").select("*").eq("sui_wallet_address", walletAddress).single()

      if (error) throw error

      setUser(data)
      localStorage.setItem("campfire_sui_wallet", walletAddress)
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("campfire_sui_wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const authenticateUser = async () => {
    if (!currentAccount) return

    setIsAuthenticating(true)
    setIsLoading(true)

    try {
      const walletAddress = currentAccount.address

      const supabase = getSupabaseClient()
      const { data: existingUser, error } = await supabase
        .from("users")
        .select("*")
        .eq("sui_wallet_address", walletAddress)
        .single()

      if (existingUser) {
        setUser(existingUser)
        localStorage.setItem("campfire_sui_wallet", walletAddress)
      }
      // If no user exists, the component will show the create account form
    } catch (error) {
      console.error("Authentication error:", error)
    } finally {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  const createUser = async (displayName: string, bio?: string, avatarUrl?: string) => {
    if (!currentAccount) throw new Error("No wallet connected")

    const walletAddress = currentAccount.address

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("users")
        .insert({
          wallet_address: walletAddress, // Keep for backward compatibility
          sui_wallet_address: walletAddress,
          display_name: displayName,
          bio: bio || null,
          avatar_url: avatarUrl || null,
          role: "user",
          wallet_type: "slush",
        })
        .select()
        .single()

      if (error) throw error

      setUser(data)
      localStorage.setItem("campfire_sui_wallet", walletAddress)
      return data
    } catch (error) {
      console.error("Error creating user:", error)
      throw error
    }
  }

  const logout = () => {
    disconnect()
    setUser(null)
    localStorage.removeItem("campfire_sui_wallet")
    hasAttemptedAuth.current = false
  }

  return {
    user,
    currentAccount,
    isLoading,
    isAuthenticating,
    createUser,
    logout,
    signMessage,
  }
}
