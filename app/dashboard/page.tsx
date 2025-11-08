"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Users,
  AwardIcon,
  Plus,
  Clock,
  CheckCircle2,
  Package,
  Building2,
  Calendar,
  Flame,
  ShoppingBag,
} from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CreateChallengeDialog } from "@/components/create-challenge-dialog"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { InventoryDialog } from "@/components/inventory-dialog"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import { EditOrgInline } from "@/components/edit-org-inline"
import { OrganizationSwitcher } from "@/components/organization-switcher"
import { CreateOrganizationButton } from "@/components/create-organization-button"
import { ThemeToggle } from "@/components/theme-toggle"

interface Challenge {
  id: number
  name: string
  description: string
  image_url: string | null
  criteria: string
  status: "open" | "closed" | "completed"
  created_at: string
}

interface Application {
  id: number
  challenge_id: number
  applicant_wallet: string
  status: "pending" | "approved" | "rejected"
  applied_at: string
  challenges: Challenge
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
}

interface Organizer {
  id: number
  wallet_address: string
  org_name: string
  org_description: string
  org_logo_url: string | null
}

export default function DashboardPage() {
  const { user } = useWalletAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [awards, setAwards] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string>("")
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [userOrgRole, setUserOrgRole] = useState<string>("")
  const [userOrganizations, setUserOrganizations] = useState<string[]>([])
  const [allOrganizations, setAllOrganizations] = useState<any[]>([])
  const [inventoryOpen, setInventoryOpen] = useState(false)

  useEffect(() => {
    if (user) {
      checkUserOrganizations()
    }
  }, [user])

  const checkUserOrganizations = async () => {
    if (!user) return

    const supabase = createClient()

    console.log("[v0] Checking user organizations for:", user.wallet_address)

    const { data: orgData } = await supabase
      .from("organizers")
      .select("wallet_address")
      .eq("wallet_address", user.wallet_address)
      .maybeSingle()

    console.log("[v0] User is organizer:", orgData)

    const { data: memberData } = await supabase
      .from("organization_members")
      .select("organization_wallet")
      .eq("user_wallet", user.wallet_address)
      .eq("status", "active")

    console.log("[v0] User memberships:", memberData)

    const orgs: string[] = []

    if (orgData) {
      orgs.push(orgData.wallet_address)
    }

    if (memberData && memberData.length > 0) {
      orgs.push(...memberData.map((m) => m.organization_wallet))
    }

    console.log("[v0] All user organizations:", orgs)

    setUserOrganizations(orgs)

    if (orgs.length > 0) {
      const { data: allOrgsData } = await supabase.from("organizers").select("*").in("wallet_address", orgs)

      console.log("[v0] Fetched organization details:", allOrgsData)

      const validOrgs = allOrgsData || []
      console.log("[v0] Valid organizations (exist in organizers table):", validOrgs)

      setAllOrganizations(validOrgs)

      if (validOrgs.length > 0) {
        const storedOrg =
          typeof window !== "undefined" ? window.localStorage.getItem("campfire_active_org") : null
        const fallbackOrg = validOrgs[0].wallet_address
        const preferredOrg = storedOrg && validOrgs.find((org) => org.wallet_address === storedOrg)
          ? storedOrg
          : fallbackOrg

        console.log("[v0] Setting selected org to:", preferredOrg)
        setSelectedOrg(preferredOrg)
        const activeOrg = validOrgs.find((org) => org.wallet_address === preferredOrg) || validOrgs[0]
        setOrganizer(activeOrg)
        if (typeof window !== "undefined") {
          window.localStorage.setItem("campfire_active_org", preferredOrg)
        }
      } else {
        console.log("[v0] No valid organizations found in organizers table")
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    if (userOrganizations.length === 0 && !isLoading) {
      router.push(`/profile/${user.wallet_address}`)
      return
    }

    if (selectedOrg) {
      fetchDashboardData()
    }
  }, [user, selectedOrg, userOrganizations])

  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab === "inventory") {
      setInventoryOpen(true)
    }
  }, [searchParams])

  const fetchDashboardData = async () => {
    if (!user || !selectedOrg) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      console.log("[v0] Fetching dashboard data for org:", selectedOrg)

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_wallet", selectedOrg)
        .eq("user_wallet", user.wallet_address)
        .maybeSingle()

      setUserOrgRole(memberData?.role || "")

      const [orgResult, challengesResult, eventsResult] = await Promise.all([
        supabase.from("organizers").select("*").eq("wallet_address", selectedOrg).maybeSingle(),
        supabase.from("challenges").select("*").eq("created_by", selectedOrg).order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("*")
          .eq("organization_id", selectedOrg)
          .order("created_at", { ascending: false }),
      ])

      console.log("[v0] Org data:", orgResult.data)
      console.log("[v0] Challenges:", challengesResult.data)
      console.log("[v0] Events:", eventsResult.data)

      if (orgResult.data) {
        setOrganizer(orgResult.data)
      }
      setChallenges(challengesResult.data || [])
      setEvents(eventsResult.data || [])

      const challengeIds = (challengesResult.data || []).map((c) => c.id)

      if (challengeIds.length > 0) {
        const [applicationsResult, awardsResult] = await Promise.all([
          supabase
            .from("challenge_applications")
            .select(
              `
            *,
            challenges(*),
            users(*)
          `,
            )
            .in("challenge_id", challengeIds)
            .order("applied_at", { ascending: false }),
          supabase.from("awards").select("*", { count: "exact", head: true }).eq("awarded_by", selectedOrg),
        ])

        setApplications(applicationsResult.data || [])
        setAwards(awardsResult.count || 0)
      } else {
        setApplications([])
        setAwards(0)
      }

      console.log("[v0] Dashboard data loaded successfully")
    } catch (error) {
      console.error("[v0] Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOrganizationSelect = (org: any) => {
    console.log("[v0] Switching to organization:", org.wallet_address)
    setSelectedOrg(org.wallet_address)
    setOrganizer(org)
    if (typeof window !== "undefined") {
      localStorage.setItem("campfire_active_org", org.wallet_address)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
                  <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
                </div>
              </div>
              {allOrganizations.length > 0 && (
                <OrganizationSwitcher
                  organizations={allOrganizations}
                  selectedOrg={organizer || allOrganizations[0]}
                  onSelect={handleOrganizationSelect}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <CreateOrganizationButton />
              <Link href="/store">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ShoppingBag className="w-4 h-4" />
                  Store
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !user || userOrganizations.length === 0 ? (
          <div className="container mx-auto px-4 py-16 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Organizations Found</h2>
            <p className="text-muted-foreground mb-6">
              You need to create or be a member of an organization to access the dashboard.
            </p>
            <Button onClick={() => router.push(`/profile/${user?.wallet_address}`)}>Go to Profile</Button>
          </div>
        ) : (
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8 animate-fade-in">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Organizer Dashboard</h1>
                  <p className="text-muted-foreground">Manage your events and challenges</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedOrg && organizer && (
                  <ManageMembersDialog
                    organizationWallet={selectedOrg}
                    organizationName={organizer.org_name}
                    userRole={userOrgRole}
                  />
                )}
                <InventoryDialog
                  organizerWallet={selectedOrg}
                  open={inventoryOpen}
                  onOpenChange={setInventoryOpen}
                >
                  <Button
                    variant="outline"
                    className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg bg-transparent"
                  >
                    <Package className="w-4 h-4" />
                    Inventory
                  </Button>
                </InventoryDialog>
                <CreateEventDialog onSuccess={fetchDashboardData} organizationId={selectedOrg}>
                  <Button className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    <Plus className="w-4 h-4" />
                    Create Event
                  </Button>
                </CreateEventDialog>
                <CreateChallengeDialog onSuccess={fetchDashboardData}>
                  <Button
                    variant="outline"
                    className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                    Create Challenge (Legacy)
                  </Button>
                </CreateChallengeDialog>
              </div>
            </div>

            {selectedOrg && organizer && (
              <div className="mb-8 animate-fade-in">
                <EditOrgInline
                  wallet={selectedOrg}
                  orgName={organizer.org_name || ""}
                  orgBio={organizer.org_description || ""}
                  orgLogoUrl={organizer.org_logo_url || ""}
                  onUpdate={fetchDashboardData}
                />
              </div>
            )}

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up animation-delay-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{events.length}</span>
                  </div>
                </CardContent>
              </Card>

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

              <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animation-delay-300">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {applications.filter((a) => a.status === "pending").length}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up animation-delay-400">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Badges Awarded</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AwardIcon className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{awards}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Your Events</h2>
                  {events.length > 0 ? (
                    <div className="space-y-4">
                      {events.map((event) => (
                        <Card
                          key={event.id}
                          className="transition-all duration-300 hover:shadow-lg hover:border-primary animate-fade-in"
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle>{event.name}</CardTitle>
                                  <Badge
                                    variant={
                                      event.status === "open"
                                        ? "default"
                                        : event.status === "draft"
                                          ? "secondary"
                                          : event.status === "ongoing"
                                            ? "default"
                                            : "outline"
                                    }
                                  >
                                    {event.status}
                                  </Badge>
                                  {event.ticket_enabled && (
                                    <Badge variant="outline" className="gap-1">
                                      <Calendar className="w-3 h-3" />
                                      Ticketed
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>{event.description}</CardDescription>
                              </div>
                              <Link href={`/events/${event.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="transition-all duration-200 hover:scale-105 bg-transparent"
                                >
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {event.start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {event.location && <span>{event.location}</span>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="animate-fade-in">
                      <CardContent className="py-12 text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">No events created yet.</p>
                        <CreateEventDialog onSuccess={fetchDashboardData} organizationId={selectedOrg}>
                          <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Create Your First Event
                          </Button>
                        </CreateEventDialog>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Your Challenges (Legacy)</h2>
                  {challenges.length > 0 ? (
                    <div className="space-y-4">
                      {challenges.map((challenge) => {
                        const challengeApplications = applications.filter((a) => a.challenge_id === challenge.id)
                        const pending = challengeApplications.filter((a) => a.status === "pending").length
                        const approved = challengeApplications.filter((a) => a.status === "approved").length

                        return (
                          <Card
                            key={challenge.id}
                            className="transition-all duration-300 hover:shadow-lg hover:border-primary animate-fade-in"
                          >
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CardTitle>{challenge.name}</CardTitle>
                                    <Badge
                                      variant={
                                        challenge.status === "open"
                                          ? "default"
                                          : challenge.status === "closed"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {challenge.status}
                                    </Badge>
                                  </div>
                                  <CardDescription>{challenge.description}</CardDescription>
                                </div>
                                <Link href={`/challenges/${challenge.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="transition-all duration-200 hover:scale-105 bg-transparent"
                                  >
                                    View Details
                                  </Button>
                                </Link>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{pending} pending</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{approved} approved</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{challengeApplications.length} total</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <Card className="animate-fade-in">
                      <CardContent className="py-12 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">No legacy challenges.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Recent Applications</h2>
                {applications.filter((a) => a.status === "pending").length > 0 ? (
                  <Card className="animate-slide-up animation-delay-100">
                    <CardContent className="py-4 space-y-4">
                      {applications
                        .filter((a) => a.status === "pending")
                        .slice(0, 10)
                        .map((application) => (
                          <div key={application.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <Link
                                  href={`/profile/${application.applicant_wallet}`}
                                  className="font-medium text-foreground hover:text-primary transition-colors"
                                >
                                  {application.users.display_name}
                                </Link>
                                <p className="text-sm text-muted-foreground">{application.challenges.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(application.applied_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No pending applications</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
