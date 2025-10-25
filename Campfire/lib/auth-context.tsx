"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  wallet_address: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: "user" | "organizer"
  created_at: string
}

interface LoginResult {
  success: boolean
  userExists: boolean
  message?: string
}

interface AuthContextType {
  user: User | null
  login: (walletAddress: string) => Promise<LoginResult>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedWallet = localStorage.getItem("campfire_wallet")
    if (storedWallet) {
      // Fetch user data
      fetchUser(storedWallet)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/auth/user?wallet=${walletAddress}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        localStorage.removeItem("campfire_wallet")
      }
    } catch (error) {
      console.error("Error fetching user:", error)
      localStorage.removeItem("campfire_wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (walletAddress: string): Promise<LoginResult> => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/auth/user?wallet=${walletAddress}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem("campfire_wallet", walletAddress)
        // Redirect to user's profile
        router.push(`/profile/${walletAddress}`)
        return { success: true, userExists: true }
      } else {
        // User not found - this is expected for new users
        return { success: false, userExists: false, message: "User not found" }
      }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, userExists: false, message: "Network error" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("campfire_wallet")
    router.push("/login")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
