"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon, AwardIcon, BuildingIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { generateUserId } from "@/lib/utils"

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
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    filterData()
  }, [searchQuery, users, organizations])

  const fetchData = async () => {
    const supabase = createClient()

    const { data: usersData } = await supabase.from("users").select("*").order("display_name")

    if (usersData) {
      const usersWithBadges = await Promise.all(
        usersData.map(async (user) => {
          const { count } = await supabase
            .from("awards")
            .select("*", { count: "exact", head: true })
            .eq("recipient_wallet", user.wallet_address)

          return { ...user, badge_count: count || 0 }
        }),
      )

      setUsers(usersWithBadges)
      setFilteredUsers(usersWithBadges)
    }

    const { data: orgsData } = await supabase.from("organizers").select("*").order("org_name")

    if (orgsData) {
      const orgsWithChallenges = await Promise.all(
        orgsData.map(async (org) => {
          const { count } = await supabase
            .from("challenges")
            .select("*", { count: "exact", head: true })
            .eq("created_by", org.wallet_address)

          return { ...org, challenge_count: count || 0 }
        }),
      )

      setOrganizations(orgsWithChallenges)
      setFilteredOrgs(orgsWithChallenges)
    }

    setIsLoading(false)
  }

  const filterData = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users)
      setFilteredOrgs(organizations)
      return
    }

    const query = searchQuery.toLowerCase()

    const filteredU = users.filter(
      (user) =>
        user.display_name.toLowerCase().includes(query) ||
        user.wallet_address.toLowerCase().includes(query) ||
        user.bio?.toLowerCase().includes(query) ||
        generateUserId(user.wallet_address).toLowerCase().includes(query),
    )

    const filteredO = organizations.filter(
      (org) =>
        org.org_name.toLowerCase().includes(query) ||
        org.wallet_address.toLowerCase().includes(query) ||
        org.org_bio?.toLowerCase().includes(query),
    )

    setFilteredUsers(filteredU)
    setFilteredOrgs(filteredO)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
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
        <div className="mb-8 animate-slide-up">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by name, wallet, user ID, or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users ({filteredUsers.length})</TabsTrigger>
            <TabsTrigger value="organizations">Organizations ({filteredOrgs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user, index) => (
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

            {filteredUsers.length === 0 && (
              <Card className="animate-fade-in">
                <CardContent className="py-12 text-center">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No users found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="organizations">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrgs.map((org, index) => (
                <Link key={org.wallet_address} href={`/org/${org.wallet_address}`}>
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

            {filteredOrgs.length === 0 && (
              <Card className="animate-fade-in">
                <CardContent className="py-12 text-center">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No organizations found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
