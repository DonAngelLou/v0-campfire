"use client"

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Calendar, Trophy, Users, CheckCircle2, Clock, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useAuth } from "@/lib/auth-context"
import { ManageApplicationsDialog } from "@/components/manage-applications-dialog"
import { ChallengeStatusControls } from "@/components/challenge-status-controls"
import { ChallengeNFTGrid } from "@/components/challenge-nft-grid"
import { AwardNFTButton } from "@/components/award-nft-button"
import { NFTDepletionDialog } from "@/components/nft-depletion-dialog"
import { NFTDetailDialog } from "@/components/nft-detail-dialog"

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
    org_logo_url: string | null
    wallet_address: string
  }
}

interface Application {
  id: number
  status: "pending" | "approved" | "rejected"
  applied_at: string
  applicant_wallet: string
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
}

interface Award {
  id: number
  recipient_wallet: string
  awarded_at: string
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
  organizer_inventory: {
    id: number
    custom_name: string | null
    custom_description: string | null
    store_items: {
      id: number
      name: string
      description: string
      rank: number
      image_url: string
      artist_name: string | null
      artist_description: string | null
      price: number
    }
  }
}

export default function ChallengeDetailPage() {
  return (
    <ProtectedRoute>
      <ChallengeDetailContent />
    </ProtectedRoute>
  )
}

function ChallengeDetailContent() {
  const params = useParams()
  const challengeId = params?.id as string
  const { user } = useAuth()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedNFT, setSelectedNFT] = useState<any>(null)

  useEffect(() => {
    if (challengeId) {
      fetchChallengeData()
    }
  }, [challengeId])

  const fetchChallengeData = async () => {
    const supabase = createClient()

    const { data: challengeData, error: challengeError } = await supabase
      .from("challenges")
      .select(`
        *,
        organizers(*)
      `)
      .eq("id", challengeId)
      .single()

    if (challengeError || !challengeData) {
      notFound()
      return
    }

    setChallenge(challengeData)

    if (user && user.wallet_address === challengeData.created_by) {
      const { data: allApplications } = await supabase
        .from("challenge_applications")
        .select(`
          *,
          users(*)
        `)
        .eq("challenge_id", challengeId)
        .order("applied_at", { ascending: false })

      setApplications(allApplications || [])
    }

    if (user) {
      const { data: applicationData } = await supabase
        .from("challenge_applications")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("applicant_wallet", user.wallet_address)
        .single()

      setApplication(applicationData)
    }

    const { count } = await supabase
      .from("challenge_applications")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId)

    setApplicationsCount(count || 0)

    const { data: awardsData } = await supabase
      .from("awards")
      .select(`
        *,
        users(*),
        organizer_inventory(
          *,
          store_items(*)
        )
      `)
      .eq("challenge_id", challengeId)
      .order("awarded_at", { ascending: false })
      .limit(10)

    setAwards(awardsData || [])

    setIsLoading(false)
  }

  const handleApply = async () => {
    if (!user || !challenge) return

    setIsApplying(true)

    const supabase = createClient()

    const { error } = await supabase.from("challenge_applications").insert({
      challenge_id: challenge.id,
      applicant_wallet: user.wallet_address,
      status: "pending",
    })

    setIsApplying(false)

    if (!error) {
      fetchChallengeData()
    }
  }

  const getRankInfo = (rank: number) => {
    const ranks = {
      5: { name: "Initiate", color: "#A0AEC0" },
      4: { name: "Adept", color: "#4299E1" },
      3: { name: "Vanguard", color: "#38A169" },
      2: { name: "Luminary", color: "#D69E2E" },
      1: { name: "Paragon", color: "#805AD5" },
    }
    return ranks[rank as keyof typeof ranks] || { name: "Unknown", color: "#666666" }
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

  if (!challenge) return null

  const canApply = challenge.status === "open" && !application && user?.wallet_address !== challenge.created_by
  const isOrganizer = user?.wallet_address === challenge.created_by
  const isCompleted = challenge.status === "completed"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {selectedNFT && (
        <NFTDetailDialog
          nft={selectedNFT}
          open={!!selectedNFT}
          onOpenChange={(open) => !open && setSelectedNFT(null)}
        />
      )}

      {isOrganizer && challenge && (
        <NFTDepletionDialog
          challengeId={challenge.id}
          onAddNFTs={fetchChallengeData}
          onMarkCompleted={fetchChallengeData}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="animate-fade-in">
              <ChallengeNFTGrid challengeId={Number.parseInt(challengeId)} />

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-3xl">{challenge.name}</CardTitle>
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
                    <CardDescription className="text-base">{challenge.description}</CardDescription>
                  </div>
                  {isOrganizer && <ChallengeStatusControls challenge={challenge} onSuccess={fetchChallengeData} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Criteria</h3>
                  <p className="text-muted-foreground">{challenge.criteria}</p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Created {new Date(challenge.created_at).toLocaleDateString()}</span>
                </div>

                {isOrganizer && !isCompleted && applications.filter((a) => a.status === "approved").length > 0 && (
                  <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/50">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Approved Users ({applications.filter((a) => a.status === "approved").length})
                    </h3>
                    <div className="space-y-2">
                      {applications
                        .filter((a) => a.status === "approved")
                        .map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg bg-background"
                          >
                            <Link
                              href={`/profile/${app.applicant_wallet}`}
                              className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={app.users.avatar_url || "/placeholder.svg"}
                                  alt={app.users.display_name}
                                />
                                <AvatarFallback>{app.users.display_name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{app.users.display_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Approved {new Date(app.applied_at).toLocaleDateString()}
                                </p>
                              </div>
                            </Link>
                            <AwardNFTButton
                              application={app}
                              challengeId={challenge.id}
                              onSuccess={fetchChallengeData}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {isOrganizer && applications.length > 0 && (
                  <ManageApplicationsDialog
                    challenge={challenge}
                    applications={applications}
                    onSuccess={fetchChallengeData}
                  >
                    <Button className="w-full gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      <Users className="w-4 h-4" />
                      Manage Applications ({applications.filter((a) => a.status === "pending").length} pending)
                    </Button>
                  </ManageApplicationsDialog>
                )}

                {canApply && (
                  <Button
                    onClick={handleApply}
                    disabled={isApplying}
                    className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    {isApplying ? "Applying..." : "Apply to Challenge"}
                  </Button>
                )}

                {application && (
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {application.status === "pending" && (
                        <>
                          <Clock className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">Application Pending</p>
                            <p className="text-sm text-muted-foreground">
                              Your application is under review by the organizer
                            </p>
                          </div>
                        </>
                      )}
                      {application.status === "approved" && (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium">Application Approved</p>
                            <p className="text-sm text-muted-foreground">
                              Congratulations! You've been approved for this challenge
                            </p>
                          </div>
                        </>
                      )}
                      {application.status === "rejected" && (
                        <>
                          <XCircle className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="font-medium">Application Rejected</p>
                            <p className="text-sm text-muted-foreground">
                              Unfortunately, your application was not approved
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isCompleted && (
              <Card className="animate-slide-up animation-delay-100">
                <CardHeader>
                  <CardTitle>Challenge Results</CardTitle>
                  <CardDescription>All participants and winners</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {awards.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          Winners ({awards.length})
                        </h3>
                        <div className="space-y-3">
                          {awards.map((award) => {
                            const nftName =
                              award.organizer_inventory.custom_name || award.organizer_inventory.store_items.name
                            const rankInfo = getRankInfo(award.organizer_inventory.store_items.rank)

                            return (
                              <div
                                key={award.id}
                                className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-all duration-200"
                              >
                                <button
                                  onClick={() =>
                                    setSelectedNFT({
                                      ...award.organizer_inventory,
                                      store_items: award.organizer_inventory.store_items,
                                    })
                                  }
                                  className="flex-shrink-0 group cursor-pointer"
                                >
                                  <div className="relative">
                                    <img
                                      src={award.organizer_inventory.store_items.image_url || "/placeholder.svg"}
                                      alt={nftName}
                                      className="w-20 h-20 rounded-lg object-cover border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
                                      style={{ borderColor: rankInfo.color }}
                                    />
                                    <div
                                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg"
                                      style={{ backgroundColor: rankInfo.color }}
                                    >
                                      {award.organizer_inventory.store_items.rank}
                                    </div>
                                  </div>
                                </button>

                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() =>
                                      setSelectedNFT({
                                        ...award.organizer_inventory,
                                        store_items: award.organizer_inventory.store_items,
                                      })
                                    }
                                    className="text-left hover:underline"
                                  >
                                    <p className="font-semibold text-sm truncate">{nftName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {rankInfo.name} • Rank {award.organizer_inventory.store_items.rank}
                                    </p>
                                  </button>

                                  <div className="flex items-center gap-2 mt-2">
                                    <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground">Winner:</span>
                                    <Link
                                      href={`/profile/${award.recipient_wallet}`}
                                      className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
                                    >
                                      <Avatar className="h-6 w-6 flex-shrink-0">
                                        <AvatarImage
                                          src={award.users.avatar_url || "/placeholder.svg"}
                                          alt={award.users.display_name}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {award.users.display_name[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm truncate">{award.users.display_name}</span>
                                    </Link>
                                  </div>

                                  <p className="text-xs text-muted-foreground mt-1">
                                    Awarded {new Date(award.awarded_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {isOrganizer && applications.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          All Participants ({applications.length})
                        </h3>
                        <div className="space-y-2">
                          {applications.map((app) => {
                            const hasAward = awards.some((a) => a.recipient_wallet === app.applicant_wallet)
                            return (
                              <Link
                                key={app.id}
                                href={`/profile/${app.applicant_wallet}`}
                                className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted transition-all duration-200 ${
                                  hasAward ? "bg-yellow-500/5 border-yellow-500/20" : ""
                                }`}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={app.users.avatar_url || "/placeholder.svg"}
                                    alt={app.users.display_name}
                                  />
                                  <AvatarFallback>{app.users.display_name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="font-medium">{app.users.display_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Applied {new Date(app.applied_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    app.status === "approved"
                                      ? "default"
                                      : app.status === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {app.status}
                                </Badge>
                                {hasAward && <Trophy className="w-4 h-4 text-yellow-500" />}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!isCompleted && awards.length > 0 && (
              <Card className="animate-slide-up animation-delay-100">
                <CardHeader>
                  <CardTitle>Recent Badge Recipients</CardTitle>
                  <CardDescription>Users who have earned this badge</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {awards.map((award) => (
                      <Link
                        key={award.id}
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
                          <p className="font-medium">{award.users.display_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Awarded {new Date(award.awarded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="animate-slide-up animation-delay-200">
              <CardHeader>
                <CardTitle className="text-lg">Created By</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/org/${challenge.created_by}`}
                  className="flex items-center gap-3 hover:bg-muted p-2 rounded-lg transition-all duration-200 hover:translate-x-1"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={challenge.organizers.org_logo_url || "/placeholder.svg"}
                      alt={challenge.organizers.org_name}
                    />
                    <AvatarFallback>
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{challenge.organizers.org_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{challenge.created_by}</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="animate-slide-up animation-delay-300">
              <CardHeader>
                <CardTitle className="text-lg">Challenge Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Applications</span>
                  </div>
                  <span className="font-bold">{applicationsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Badges Awarded</span>
                  </div>
                  <span className="font-bold">{awards.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
