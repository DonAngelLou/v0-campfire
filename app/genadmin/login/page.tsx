"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertCircle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase"

const SUPERADMIN_WALLET = "your-admin.eth"

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showCreateAccount, setShowCreateAccount] = useState(false)

  // Account creation fields
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>("")

  if (user?.wallet_address === SUPERADMIN_WALLET) {
    router.push("/genadmin")
    return null
  }

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (walletAddress.toLowerCase() !== SUPERADMIN_WALLET.toLowerCase()) {
        setError("Invalid super admin credentials")
        setLoading(false)
        return
      }

      // Check if user exists
      const supabase = createClient()
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle()

      if (fetchError) {
        console.error("[v0] Error checking user:", fetchError)
        setError("Error checking user: " + fetchError.message)
        setLoading(false)
        return
      }

      if (!existingUser) {
        console.log("[v0] Superadmin account not found, showing create account form")
        setShowCreateAccount(true)
        setLoading(false)
        return
      }

      console.log("[v0] Superadmin login successful")
      localStorage.setItem("campfire_wallet", walletAddress)

      // Force page reload to update auth context
      window.location.href = "/genadmin"
    } catch (err: any) {
      console.error("[v0] Login error:", err)
      setError(err.message || "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("[v0] Creating superadmin account for:", walletAddress)

      let avatarUrl = ""

      if (avatarFile) {
        console.log("[v0] Uploading avatar...")
        const formData = new FormData()
        formData.append("file", avatarFile)
        formData.append("walletAddress", walletAddress)

        const uploadResponse = await fetch("/api/upload-avatar", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload avatar")
        }

        const uploadResult = await uploadResponse.json()
        avatarUrl = uploadResult.url
        console.log("[v0] Avatar uploaded:", avatarUrl)
      }

      const supabase = createClient()
      const { error: insertError } = await supabase.from("users").insert({
        wallet_address: walletAddress,
        display_name: displayName,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        role: "user",
      })

      if (insertError) {
        console.error("[v0] Error creating account:", insertError)
        throw new Error(insertError.message)
      }

      console.log("[v0] Superadmin account created successfully")

      localStorage.setItem("campfire_wallet", walletAddress)

      // Force page reload to update auth context
      window.location.href = "/genadmin"
    } catch (err: any) {
      console.error("[v0] Error creating account:", err)
      setError(err.message || "Failed to create account")
      setLoading(false)
    }
  }

  if (showCreateAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Create Super Admin Account</CardTitle>
            <CardDescription>Set up your super admin profile</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input value={walletAddress} disabled className="font-mono text-sm" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar</Label>
                <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
                {avatarPreview && (
                  <div className="mt-2">
                    <img
                      src={avatarPreview || "/placeholder.svg"}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateAccount(false)
                    setError("")
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading || !displayName} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Super Admin Login</CardTitle>
          <CardDescription>Access the system administration dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="wallet">Super Admin Wallet Address</Label>
              <Input
                id="wallet"
                type="text"
                placeholder="your-admin.eth"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Enter your super admin wallet address</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Access Dashboard
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              This is a restricted area. Only authorized super administrators can access this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
