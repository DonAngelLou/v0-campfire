"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Flame, CheckCircle2, Award, Users, ShoppingBag, Trophy, LayoutDashboard } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CreateOrganizationForm } from "@/components/create-organization-form"
import { CreateChallengeDialog } from "@/components/create-challenge-dialog"
import { ManageApplicationsDialog } from "@/components/manage-applications-dialog"
import { InventoryDialog } from "@/components/inventory-dialog"

interface OrganizerPageProps {
  params: Promise<{
    wallet: string
  }>
}

export default function OrganizerPage({ params }: OrganizerPageProps) {
  const { user } = useWalletAuth()
  const router = useRouter()
  const [wallet, setWallet] = useState<string>("")
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [challenges, setChallenges] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [awards, setAwards] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    params.then((p) => setWallet(p.wallet))
  }, [params])

  useEffect(() => {
    if (!user || !wallet) return

    const fetchOrganizations = async () => {
      const supabase = createClient()

      // Fetch organizations where user is a member
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("*, organizers(*, users(*))")
        .eq("user_wallet", user.wallet_address)
        .eq("status", "active")

      if (memberships && memberships.length > 0) {
        const orgs = memberships.map((m: any) => m.organizers)
        setOrganizations(orgs)
        setSelectedOrg(orgs[0]) // Select first org by default
      }

      setIsLoading(false)
    }

    fetchOrganizations()
  }, [user, wallet])

  useEffect(() => {
    if (!selectedOrg) return

    const fetchOrgData = async () => {
      const supabase = createClient()

      // Fetch challenges
      const { data: challengesData } = await supabase
        .from("challenges")
        .select("*, challenge_applications(*)")
        .eq("organizer_wallet", selectedOrg.wallet_address)
        .order("created_at", { ascending: false })

      setChallenges(challengesData || [])

      // Fetch inventory
      const { data: inventoryData } = await supabase
        .from("organizer_inventory")
        .select("*, store_items(*)")
        .eq("organizer_wallet", selectedOrg.wallet_address)
        .eq("awarded", false)
        .order("purchased_at", { ascending: false })

      setInventory(inventoryData || [])

      // Fetch awards
      const { data: awardsData } = await supabase
        .from("awards")
        .select("*, users(*), store_items(*)")
        .eq("awarded_by", selectedOrg.wallet_address)
        .order("awarded_at", { ascending: false })
        .limit(10)

      setAwards(awardsData || [])
    }

    fetchOrgData()
  }, [selectedOrg])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
                <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
              </div>
            </div>
          </div>
        </header>
        <CreateOrganizationForm />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
              <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/store">
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <ShoppingBag className="w-4 h-4" />
                Store
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Organization Profile */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={selectedOrg.org_logo_url || "/placeholder.svg"} alt={selectedOrg.org_name} />
              <AvatarFallback>{selectedOrg.org_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{selectedOrg.org_name}</h2>
                {selectedOrg.verified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-foreground">{selectedOrg.org_description}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{challenges.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{inventory.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Badges Awarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{awards.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {challenges.reduce((acc, c) => acc + (c.challenge_applications?.length || 0), 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <CreateChallengeDialog organizerWallet={selectedOrg.wallet_address}>
            <Button className="w-full h-20 text-lg" size="lg">
              <Trophy className="w-5 h-5 mr-2" />
              Create Challenge
            </Button>
          </CreateChallengeDialog>

          <ManageApplicationsDialog organizerWallet={selectedOrg.wallet_address}>
            <Button variant="outline" className="w-full h-20 text-lg bg-transparent" size="lg">
              <Users className="w-5 h-5 mr-2" />
              Manage Applications
            </Button>
          </ManageApplicationsDialog>

          <InventoryDialog organizerWallet={selectedOrg.wallet_address}>
            <Button variant="outline" className="w-full h-20 text-lg bg-transparent" size="lg">
              <Award className="w-5 h-5 mr-2" />
              View Inventory
            </Button>
          </InventoryDialog>
        </div>

        {/* Challenges Section */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-4">Active Challenges</h3>
          {challenges.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {challenges.slice(0, 4).map((challenge) => (
                <Card key={challenge.id}>
                  <CardHeader>
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription>{challenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge>{challenge.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {challenge.challenge_applications?.length || 0} applications
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No challenges yet. Create your first one!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Awards Section */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-4">Recent Awards</h3>
          {awards.length > 0 ? (
            <div className="space-y-4">
              {awards.slice(0, 5).map((award) => (
                <Card key={award.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={award.store_items?.image_url || "/placeholder.svg"}
                          alt={award.store_items?.name || "Badge"}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {award.custom_name || award.store_items?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Awarded to <span className="font-medium">{award.users?.display_name}</span>
                        </p>
                        {award.notes && <p className="text-sm text-muted-foreground mt-1">"{award.notes}"</p>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(award.awarded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No badges awarded yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
