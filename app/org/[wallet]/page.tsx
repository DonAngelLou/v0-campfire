"use client"

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Trophy, AwardIcon, CheckCircle2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"

interface Organizer {
  wallet_address: string
  org_name: string
  org_description: string | null
  org_logo_url: string | null
  verified: boolean
}

interface User {
  wallet_address: string
  display_name: string
  avatar_url: string | null
}

interface Challenge {
  id: number
  name: string
  description: string
  image_url: string | null
  criteria: string
  status: "open" | "closed" | "completed"
  created_at: string
}

interface Award {
  id: number
  recipient_wallet: string
  awarded_at: string
  challenges: Challenge
  users: User
}

export default function OrganizationPage() {
  return (
    <ProtectedRoute>
      <OrganizationContent />
    </ProtectedRoute>
  )
}

function OrganizationContent() {
  const params = useParams()
  const wallet = params?.wallet as string
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (wallet) {
      fetchOrganizationData()
    }
  }, [wallet])

  const fetchOrganizationData = async () => {
    const supabase = createClient()

    // Fetch organizer data
    const { data: orgData, error: orgError } = await supabase
      .from("organizers")
      .select("*")
      .eq("wallet_address", wallet)
      .single()

    if (orgError || !orgData) {
      notFound()
      return
    }

    setOrganizer(orgData)

    // Fetch user data
    const { data: userData } = await supabase.from("users").select("*").eq("wallet_address", wallet).single()

    setUser(userData)

    // Fetch challenges
    const { data: challengesData } = await supabase
      .from("challenges")
      .select("*")
      .eq("created_by", wallet)
      .order("created_at", { ascending: false })

    setChallenges(challengesData || [])

    // Fetch awards
    const { data: awardsData } = await supabase
      .from("awards")
      .select(`
        *,
        challenges(*),
        users(*)
      `)
      .eq("awarded_by", wallet)
      .order("awarded_at", { ascending: false })
      .limit(10)

    setAwards(awardsData || [])

    setIsLoading(false)
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

  if (!organizer) return null

  const openChallenges = challenges.filter((c) => c.status === "open")
  const closedChallenges = challenges.filter((c) => c.status === "closed" || c.status === "completed")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Organization Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 transition-transform duration-300 hover:scale-110">
              <AvatarImage src={organizer.org_logo_url || "/placeholder.svg"} alt={organizer.org_name} />
              <AvatarFallback>
                <Building2 className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{organizer.org_name}</h2>
                {organizer.verified && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-2 font-mono text-sm">{wallet}</p>
              {organizer.org_description && <p className="text-foreground">{organizer.org_description}</p>}

              {user && (
                <div className="mt-4">
                  <Link href={`/profile/${wallet}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 transition-all duration-300 hover:scale-105 bg-transparent"
                    >
                      View User Profile
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up animation-delay-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{challenges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up animation-delay-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{openChallenges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up animation-delay-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Badges Awarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AwardIcon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{awards.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Challenges Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Open Challenges */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Open Challenges</h3>
              {openChallenges.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {openChallenges.map((challenge) => (
                    <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                      <Card className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-fade-in cursor-pointer">
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <img
                            src={
                              challenge.image_url ||
                              `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(challenge.name + " challenge")}`
                            }
                            alt={challenge.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <CardTitle>{challenge.name}</CardTitle>
                            <Badge variant="default">Open</Badge>
                          </div>
                          <CardDescription>{challenge.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            <strong>Criteria:</strong> {challenge.criteria}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card className="animate-fade-in">
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No open challenges at the moment.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Closed Challenges */}
            {closedChallenges.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Past Challenges</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {closedChallenges.map((challenge) => (
                    <Link key={challenge.id} href={`/challenges/${challenge.id}`}>
                      <Card className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in cursor-pointer opacity-75">
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          <img
                            src={
                              challenge.image_url ||
                              `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(challenge.name + " challenge")}`
                            }
                            alt={challenge.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <CardTitle>{challenge.name}</CardTitle>
                            <Badge variant="secondary">{challenge.status}</Badge>
                          </div>
                          <CardDescription>{challenge.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Awards Section */}
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Recent Awards</h3>
            {awards.length > 0 ? (
              <Card className="animate-slide-up animation-delay-100">
                <CardContent className="py-4 space-y-4">
                  {awards.map((award) => (
                    <div key={award.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <Link
                        href={`/profile/${award.recipient_wallet}`}
                        className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-all duration-200 hover:translate-x-1"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={award.users.avatar_url || "/placeholder.svg"}
                            alt={award.users.display_name}
                          />
                          <AvatarFallback>{award.users.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{award.users.display_name}</p>
                          <p className="text-sm text-muted-foreground">{award.challenges.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(award.awarded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No awards yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
