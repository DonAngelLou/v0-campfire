"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trophy, Search, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"

interface Challenge {
  id: number
  name: string
  description: string
  image_url: string | null
  criteria: string
  status: "open" | "closed" | "completed"
  created_by: string
  created_at: string
  organizers: {
    org_name: string
    wallet_address: string
  }
}

export default function LegacyChallengesPage() {
  return (
    <ProtectedRoute>
      <LegacyChallengesContent />
    </ProtectedRoute>
  )
}

function LegacyChallengesContent() {
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [filteredChallenges, setFilteredChallenges] = useState<Challenge[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [orgSuggestions, setOrgSuggestions] = useState<{ name: string; wallet: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    fetchChallenges()
  }, [])

  useEffect(() => {
    filterChallenges()
    updateOrgSuggestions()
  }, [challenges, searchQuery])

  const fetchChallenges = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("challenges")
      .select(`
        *,
        organizers(*)
      `)
      .eq("status", "open")
      .order("created_at", { ascending: false })

    setChallenges(data || [])
    setIsLoading(false)
  }

  const updateOrgSuggestions = () => {
    if (!searchQuery) {
      setOrgSuggestions([])
      setShowSuggestions(false)
      return
    }

    const uniqueOrgs = challenges.reduce(
      (acc, challenge) => {
        const orgName = challenge.organizers.org_name.toLowerCase()
        if (orgName.includes(searchQuery.toLowerCase()) && !acc.some((o) => o.name === challenge.organizers.org_name)) {
          acc.push({
            name: challenge.organizers.org_name,
            wallet: challenge.organizers.wallet_address,
          })
        }
        return acc
      },
      [] as { name: string; wallet: string }[],
    )

    setOrgSuggestions(uniqueOrgs.slice(0, 5))
    setShowSuggestions(uniqueOrgs.length > 0)
  }

  const filterChallenges = () => {
    let filtered = challenges

    if (searchQuery) {
      filtered = filtered.filter(
        (challenge) =>
          challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          challenge.organizers.org_name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredChallenges(filtered)
  }

  const handleOrgSelect = (orgName: string) => {
    setSearchQuery(orgName)
    setShowSuggestions(false)
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Legacy Challenges</h1>
          <p className="text-muted-foreground">Browse standalone challenges from before the event system</p>
        </div>

        <div className="mb-8 animate-slide-up animation-delay-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search challenges or organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              className="pl-10"
            />
            {showSuggestions && orgSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2 px-2">Organizations</p>
                  {orgSuggestions.map((org) => (
                    <button
                      key={org.wallet}
                      onClick={() => handleOrgSelect(org.name)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm transition-colors flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{org.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {filteredChallenges.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge, index) => (
              <Card
                key={challenge.id}
                onClick={() => router.push(`/challenges/${challenge.id}`)}
                className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-fade-in cursor-pointer h-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img
                    src={
                      challenge.image_url ||
                      `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(challenge.name + " challenge badge") || "/placeholder.svg"}`
                    }
                    alt={challenge.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{challenge.name}</CardTitle>
                    <Badge variant="default">Open</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/org/${challenge.created_by}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{challenge.organizers.org_name}</span>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="animate-fade-in">
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No open challenges found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
