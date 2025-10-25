"use client"

import type React from "react"

import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from "@mysten/dapp-kit"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Loader2, Wallet } from "lucide-react"

export function WalletConnect() {
  const currentAccount = useCurrentAccount()
  const wallets = useWallets()
  const { mutate: connect } = useConnectWallet()
  const { mutate: disconnect } = useDisconnectWallet()
  const { user, isLoading, createUser } = useWalletAuth()
  const router = useRouter()

  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    console.log("[v0] Wallet state:", {
      currentAccount: currentAccount?.address,
      walletsAvailable: wallets.length,
      user: user?.wallet_address,
    })
  }, [currentAccount, wallets, user])

  useEffect(() => {
    if (user && currentAccount) {
      console.log("[v0] User authenticated, redirecting to profile")
      router.push(`/profile/${currentAccount.address}`)
    }
  }, [user, currentAccount, router])

  useEffect(() => {
    if (currentAccount && !user && !isLoading) {
      setShowCreateAccount(true)
    }
  }, [currentAccount, user, isLoading])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentAccount) return

    setError("")
    setIsCreating(true)

    try {
      let avatarUrl: string | null = null

      if (avatarFile) {
        try {
          const formData = new FormData()
          formData.append("file", avatarFile)
          formData.append("walletAddress", currentAccount.address)

          const response = await fetch("/api/upload-avatar", {
            method: "POST",
            body: formData,
          })

          if (response.ok) {
            const data = await response.json()
            avatarUrl = data.url
          } else {
            console.warn("[v0] Avatar upload failed, continuing without avatar")
          }
        } catch (uploadError) {
          console.warn("[v0] Avatar upload error, continuing without avatar:", uploadError)
        }
      }

      await createUser(displayName, bio, avatarUrl || undefined)
    } catch (err) {
      console.error("Account creation error:", err)
      setError("Failed to create account. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleConnectWallet = () => {
    console.log("[v0] Connect button clicked, available wallets:", wallets.length)

    if (wallets.length === 0) {
      alert("No SUI wallets detected. Please install Slush Wallet or another SUI wallet extension.")
      return
    }

    const firstWallet = wallets[0]
    console.log("[v0] Connecting to wallet:", firstWallet.name)
    connect(
      { wallet: firstWallet },
      {
        onSuccess: () => console.log("[v0] Wallet connected successfully"),
        onError: (error) => console.error("[v0] Wallet connection error:", error),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentAccount) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <Button
          onClick={handleConnectWallet}
          size="lg"
          className="w-full max-w-sm bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Connect Slush Wallet
        </Button>
        <p className="text-sm text-muted-foreground text-center">Connect your Slush Wallet to access Campfire</p>
        {wallets.length === 0 && (
          <p className="text-xs text-destructive text-center">
            No SUI wallet detected. Please install Slush Wallet extension.
          </p>
        )}
      </div>
    )
  }

  if (showCreateAccount && !user) {
    return (
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-fade-in">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Wallet <strong className="text-xs break-all">{currentAccount.address}</strong> connected. Let's create your
            profile!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Picture (Optional)</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview || "/placeholder.svg"}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name *
              </label>
              <Input
                id="displayName"
                type="text"
                placeholder="e.g., John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="transition-all duration-200 focus:scale-102"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium">
                Bio (Optional)
              </label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="resize-none transition-all duration-200 focus:scale-102"
              />
            </div>

            {error && <p className="text-sm text-destructive animate-fade-in">{error}</p>}

            <Button
              type="submit"
              className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return null
}
