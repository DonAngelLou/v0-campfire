"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, AwardIcon, Plus, Clock, CheckCircle2, Package, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CreateChallengeDialog } from "@/components/create-challenge-dialog"
import { InventoryDialog } from "@/components/inventory-dialog"
import { ManageMembersDialog } from "@/components/manage-members-dialog"
import Link from "next/link"
import { EditOrgInline } from "@/components/edit-org-inline"
import { OrganizationSelector } from "@/components/organization-selector"

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
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user } = useWalletAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [awards, setAwards] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string>("")
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [userOrgRole, setUserOrgRole] = useState<string>("")
  const [userOrganizations, setUserOrganizations] = useState<string[]>([])

  useEffect(() => {
    if (user) {
      checkUserOrganizations()
    }
  }, [user])

  const checkUserOrganizations = async () => {
    if (!user) return

    const supabase = createClient()

    // Check if user is an organizer
    const { data: orgData } = await supabase
      .from("organizers")
      .select("wallet_address")
      .eq("wallet_address", user.wallet_address)
      .single()

    // Check if user is a member of any organizations
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("organization_wallet")
      .eq("user_wallet", user.wallet_address)
      .eq("status", "active")

    const orgs: string[] = []

    if (orgData) {
      orgs.push(orgData.wallet_address)
    }

    if (memberData && memberData.length > 0) {
      orgs.push(...memberData.map((m) => m.organization_wallet))
    }

    setUserOrganizations(orgs)

    // Set default selected org
    if (orgs.length > 0 && !selectedOrg) {
      setSelectedOrg(orgs[0])
    } else if (orgs.length === 0) {
      // User has no organizations, redirect to profile
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
        .single()

      setUserOrgRole(memberData?.role || "")

      const [orgResult, challengesResult] = await Promise.all([
        supabase.from("organizers").select("*").eq("wallet_address", selectedOrg).single(),
        supabase.from("challenges").select("*").eq("created_by", selectedOrg).order("created_at", { ascending: false }),
      ])

      console.log("[v0] Org data:", orgResult.data)
      console.log("[v0] Challenges:", challengesResult.data)

      setOrganizer(orgResult.data)
      setChallenges(challengesResult.data || [])

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

  if (!user || userOrganizations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Organizations Found</h2>
          <p className="text-muted-foreground mb-6">
            You need to create or be a member of an organization to access the dashboard.
          </p>
          <Button onClick={() => router.push(`/profile/${user?.wallet_address}`)}>Go to Profile</Button>
        </div>
      </div>
    )
  }

  const pendingApplications = applications.filter((a) => a.status === "pending")
  const openChallenges = challenges.filter((c) => c.status === "open")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Organizer Dashboard</h1>
              <p className="text-muted-foreground">Manage your challenges and applications</p>
            </div>
            <OrganizationSelector value={selectedOrg} onChange={setSelectedOrg} />
          </div>
          <div className="flex items-center gap-2">
            {selectedOrg && organizer && (
              <ManageMembersDialog
                organizationWallet={selectedOrg}
                organizationName={organizer.org_name}
                userRole={userOrgRole}
              />
            )}
            <InventoryDialog>
              <Button
                variant="outline"
                className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg bg-transparent"
              >
                <Package className="w-4 h-4" />
                Inventory
              </Button>
            </InventoryDialog>
            <CreateChallengeDialog onSuccess={fetchDashboardData}>
              <Button className="gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                <Plus className="w-4 h-4" />
                Create Challenge
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
            <CardHeader>
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
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{pendingApplications.length}</span>
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
          {/* Challenges Section */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-4">Your Challenges</h2>
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
                  <p className="text-muted-foreground mb-4">No challenges created yet.</p>
                  <CreateChallengeDialog onSuccess={fetchDashboardData}>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Challenge
                    </Button>
                  </CreateChallengeDialog>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Recent Applications Section */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Recent Applications</h2>
            {pendingApplications.length > 0 ? (
              <Card className="animate-slide-up animation-delay-100">
                <CardContent className="py-4 space-y-4">
                  {pendingApplications.slice(0, 10).map((application) => (
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
    </div>
  )
}
