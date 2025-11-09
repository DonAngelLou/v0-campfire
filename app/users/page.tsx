"use client"

import { useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon, AwardIcon, BuildingIcon, ScanLine } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { generateUserId } from "@/lib/utils"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"

interface User {
  wallet_address: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: "user" | "organizer"
  badge_count?: number
}

interface Organization {
  wallet_address: string
  org_name: string
  org_bio: string | null
  org_logo_url: string | null
  challenge_count?: number
}

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <UsersContent />
    </ProtectedRoute>
  )
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleSearch = async (override?: string) => {
    const queryRaw = (override ?? searchQuery).trim()
    if (!queryRaw) {
      setUsers([])
      setOrganizations([])
      setHasSearched(false)
      setErrorMessage(null)
      return
    }

    setIsSearching(true)
    setHasSearched(true)
    setErrorMessage(null)

    const supabase = createClient()
    const query = queryRaw.toLowerCase()
    const isUserIdSearch = query.startsWith("#")

    try {
      let userResults: User[] = []

      if (isUserIdSearch) {
        const { data: allUsers } = await supabase.from("users").select("*")
        if (allUsers) {
          userResults = allUsers.filter(
            (user) => generateUserId(user.wallet_address).toLowerCase() === query,
          )
        }
      } else {
        const { data: userMatches } = await supabase
          .from("users")
          .select("*")
          .or(
            `display_name.ilike.%${queryRaw}%,wallet_address.ilike.%${queryRaw}%,sui_wallet_address.ilike.%${queryRaw}%`,
          )
          .limit(50)

        userResults = userMatches || []
      }

      const usersWithBadges = await Promise.all(
        userResults.map(async (user) => {
          const { count } = await supabase
            .from("awards")
            .select("*", { count: "exact", head: true })
            .eq("recipient_wallet", user.wallet_address)
          return { ...user, badge_count: count || 0 }
        }),
      )
      setUsers(usersWithBadges)

      const { data: orgMatches } = await supabase
        .from("organizers")
        .select("*")
        .or(`org_name.ilike.%${queryRaw}%,wallet_address.ilike.%${queryRaw}%,org_description.ilike.%${queryRaw}%`)
        .limit(50)

      const orgsWithChallenges = await Promise.all(
        (orgMatches || []).map(async (org) => {
          const { count } = await supabase
            .from("challenges")
            .select("*", { count: "exact", head: true })
            .eq("created_by", org.wallet_address)
          return { ...org, challenge_count: count || 0 }
        }),
      )
      setOrganizations(orgsWithChallenges)
    } catch (error) {
      console.error("[v0] User directory search error:", error)
      setErrorMessage("Unable to search right now. Please try again shortly.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    handleSearch()
  }

  const handleUserScanned = (walletAddress: string) => {
    setSearchQuery(walletAddress)
    handleSearch(walletAddress)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">Directory</h1>
          <p className="text-muted-foreground">Discover users and organizations</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="mb-6 animate-slide-up space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Enter display name, wallet address, or user ID (e.g., #4863)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setScannerOpen(true)} className="gap-2">
                <ScanLine className="w-4 h-4" />
                Scan QR
              </Button>
            </div>
          </div>
          {!hasSearched && (
            <p className="text-sm text-muted-foreground">
              Enter a wallet address, display name, or user ID to view matching users. Use the QR scanner to search
              directly from a profile QR code.
            </p>
          )}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        </form>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="organizations">Organizations ({organizations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>Search or scan to view users.</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>No users found matching your query.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user, index) => (
                  <Link key={user.wallet_address} href={`/profile/${user.wallet_address}`}>
                    <Card
                      className="transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16 transition-transform duration-300 hover:scale-110">
                            <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.display_name} />
                            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground truncate">{user.display_name}</h3>
                              <span className="text-xs text-muted-foreground font-mono">
                                {generateUserId(user.wallet_address)}
                              </span>
                            </div>
                            <Badge variant="outline" className="capitalize text-xs mb-2">
                              {user.role}
                            </Badge>
                            <p className="text-xs text-muted-foreground font-mono truncate mb-2">{user.wallet_address}</p>
                            {user.bio && <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>}
                            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                              <AwardIcon className="w-4 h-4 text-primary" />
                              <span>
                                {user.badge_count} {user.badge_count === 1 ? "badge" : "badges"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-12 text-muted-foreground">
                <BuildingIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>Search above to view organizations.</p>
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BuildingIcon className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <p>No organizations found matching your query.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.map((org, index) => (
                  <Link key={org.wallet_address} href={`/organizer/${org.wallet_address}`}>
                    <Card
                      className="transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-fade-in cursor-pointer"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16 transition-transform duration-300 hover:scale-110">
                            <AvatarImage src={org.org_logo_url || "/placeholder.svg"} alt={org.org_name} />
                            <AvatarFallback>{org.org_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate mb-1">{org.org_name}</h3>
                            <Badge variant="outline" className="text-xs mb-2">
                              <BuildingIcon className="w-3 h-3 mr-1" />
                              Organization
                            </Badge>
                            <p className="text-xs text-muted-foreground font-mono truncate mb-2">{org.wallet_address}</p>
                            {org.org_bio && <p className="text-sm text-muted-foreground line-clamp-2">{org.org_bio}</p>}
                            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                              <AwardIcon className="w-4 h-4 text-primary" />
                              <span>
                                {org.challenge_count} {org.challenge_count === 1 ? "challenge" : "challenges"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <QRScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} eventId="" onUserScanned={handleUserScanned} />
    </div>
  )
}
