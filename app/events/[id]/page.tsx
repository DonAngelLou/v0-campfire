"use client"

import { useEffect, useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, Ticket, Trophy, Target, Star, Plus, Flame, ScanLine } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CreateEventChallengeDialog } from "@/components/create-event-challenge-dialog"
import { MilestoneThresholdManager } from "@/components/milestone-threshold-manager"
import { ChallengeSubmissionDialog } from "@/components/challenge-submission-dialog"
import { ParticipantProgressCard } from "@/components/participant-progress-card"
import { OrganizerChallengeReview } from "@/components/organizer-challenge-review"
import { ManageEventTeamDialog } from "@/components/manage-event-team-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { QRScannerDialog } from "@/components/qr-scanner-dialog"
import { UserValidationCard } from "@/components/user-validation-card"

interface Event {
  id: string
  name: string
  description: string
  criteria: string | null
  location: string | null
  start_date: string | null
  end_date: string | null
  status: "draft" | "open" | "ongoing" | "completed"
  organizer_id: string
  organization_id: string
  ticket_enabled: boolean
  ticket_price: number
  ticket_supply: number | null
  milestone_enabled: boolean
  milestone_sequential: boolean
  milestone_description: string | null
  created_at: string
}

interface Registration {
  id: string
  status: "registered" | "cancelled"
  registration_date: string
  payment_status: "pending" | "completed" | "refunded"
  payment_amount: number
}

interface EventChallenge {
  id: string
  name: string
  description: string
  challenge_type: "milestone" | "special" | "regular"
  milestone_order: number | null
  milestone_points: number | null
  special_max_winners: number | null
  status: string
}

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <EventDetailContent />
    </ProtectedRoute>
  )
}

function EventDetailContent() {
  const params = useParams()
  const eventId = params?.id as string
  const { user, isLoading: isAuthLoading } = useWalletAuth()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [challenges, setChallenges] = useState<EventChallenge[]>([])
  const [registrationCount, setRegistrationCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [userSubmissions, setUserSubmissions] = useState<Set<string>>(new Set())
  const [userTeamRole, setUserTeamRole] = useState<"admin" | "staff" | "facilitator" | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannedUserWallet, setScannedUserWallet] = useState<string | null>(null)

  useEffect(() => {
    if (eventId) {
      fetchEventData()
    }
  }, [eventId])

  useEffect(() => {
    if (event && !isAuthLoading) {
      checkTeamMembership()
    }
  }, [event, user, isAuthLoading])

  useEffect(() => {
    if (event && user && !isAuthLoading) {
      fetchUserData()
    }
  }, [event, user, isAuthLoading])

  const fetchEventData = async () => {
    const supabase = createClient()

    const { data: eventData, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).single()

    if (eventError || !eventData) {
      notFound()
      return
    }

    setEvent(eventData)

    const { data: challengesData } = await supabase
      .from("event_challenges")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "active")
      .order("challenge_type", { ascending: true })
      .order("milestone_order", { ascending: true })

    setChallenges(challengesData || [])

    const { count } = await supabase
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "registered")

    setRegistrationCount(count || 0)

    setIsLoading(false)
  }

  const checkTeamMembership = async () => {
    if (!event) return

    console.log("[v0] 🔍 Checking team membership...")
    console.log("[v0] User wallet:", user?.wallet_address)
    console.log("[v0] Event organizer_id:", event.organizer_id)
    console.log("[v0] Auth loading:", isAuthLoading)

    if (!user) {
      console.log("[v0] ❌ No user loaded yet")
      setUserTeamRole(null)
      return
    }

    const supabase = createClient()

    // Check if user is in event team
    const { data: teamMember } = await supabase
      .from("event_team_members")
      .select("role")
      .eq("event_id", eventId)
      .eq("user_id", user.wallet_address)
      .single()

    console.log("[v0] Team member query result:", teamMember)

    if (teamMember) {
      setUserTeamRole(teamMember.role)
      console.log("[v0] ✅ User is team member with role:", teamMember.role)
    } else if (user.wallet_address === event.organizer_id) {
      setUserTeamRole("admin")
      console.log("[v0] ✅ User is event organizer (admin)")
    } else {
      setUserTeamRole(null)
      console.log("[v0] ❌ User is not organizer or team member")
    }
  }

  const fetchUserData = async () => {
    if (!user || !event) return

    const supabase = createClient()

    const { data: registrationData } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", user.wallet_address)
      .single()

    setRegistration(registrationData)

    const { data: submissionsData } = await supabase
      .from("challenge_completions")
      .select("challenge_id")
      .eq("user_id", user.wallet_address)

    if (submissionsData) {
      setUserSubmissions(new Set(submissionsData.map((s) => s.challenge_id)))
    }
  }

  const handleRegister = async () => {
    if (!user || !event) return

    setIsRegistering(true)

    const supabase = createClient()

    const { error } = await supabase.from("event_registrations").insert({
      event_id: event.id,
      user_id: user.wallet_address,
      payment_status: "completed",
      payment_amount: event.ticket_price || 0,
      status: "registered",
    })

    setIsRegistering(false)

    if (!error) {
      fetchUserData()
    }
  }

  const handleUserScanned = (walletAddress: string) => {
    console.log("[v0] User scanned:", walletAddress)
    setScannedUserWallet(walletAddress)
  }

  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
                <Flame className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
                  <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="bg-transparent">
                Dashboard
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!event) return null

  const canRegister = event.status === "open" && !registration && !userTeamRole
  const isOrganizer = userTeamRole !== null
  const isFull = event.ticket_supply && registrationCount >= event.ticket_supply

  const milestoneChallenges = challenges.filter((c) => c.challenge_type === "milestone")
  const specialChallenges = challenges.filter((c) => c.challenge_type === "special")
  const regularChallenges = challenges.filter((c) => c.challenge_type === "regular")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <Flame className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
                <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="bg-transparent">
              Dashboard
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="animate-fade-in">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-3xl">{event.name}</CardTitle>
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
                    </div>
                    <CardDescription className="text-base">{event.description}</CardDescription>
                  </div>
                  {isOrganizer && userTeamRole === "admin" && event.organization_id && (
                    <ManageEventTeamDialog
                      eventId={eventId}
                      eventName={event.name}
                      organizationId={event.organization_id}
                      userRole={userTeamRole}
                      onTeamUpdate={checkTeamMembership}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.criteria && (
                  <div>
                    <h3 className="font-semibold mb-2">Participation Criteria</h3>
                    <p className="text-muted-foreground">{event.criteria}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {event.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(event.start_date).toLocaleDateString()}
                        {event.end_date && ` - ${new Date(event.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {event.milestone_enabled && (
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      Milestone Track Available
                    </h3>
                    {event.milestone_description && (
                      <p className="text-sm text-muted-foreground">{event.milestone_description}</p>
                    )}
                    <Badge variant="outline" className="mt-2">
                      {event.milestone_sequential ? "Sequential" : "Parallel"} Completion
                    </Badge>
                  </div>
                )}

                {canRegister && (
                  <div className="space-y-3">
                    {event.ticket_enabled && (
                      <div className="p-4 border border-border rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-primary" />
                            <span className="font-semibold">Event Ticket Required</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">
                            {event.ticket_price === 0 ? "Free" : `${event.ticket_price} SUI`}
                          </span>
                        </div>
                        {event.ticket_supply && (
                          <p className="text-sm text-muted-foreground">
                            {registrationCount} / {event.ticket_supply} tickets claimed
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleRegister}
                      disabled={isRegistering || isFull}
                      className="w-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      size="lg"
                    >
                      {isRegistering
                        ? "Registering..."
                        : isFull
                          ? "Event Full"
                          : event.ticket_price === 0
                            ? "Register for Free"
                            : `Register for ${event.ticket_price} SUI`}
                    </Button>
                  </div>
                )}

                {registration && (
                  <div className="p-4 border border-green-500/20 rounded-lg bg-green-500/10">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600 dark:text-green-400">Registered Successfully</p>
                        <p className="text-sm text-muted-foreground">
                          You're all set for this event! Check back for challenges and activities.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isOrganizer && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Staff Actions</CardTitle>
                        <CardDescription>Scan QR codes or search users to validate and award</CardDescription>
                      </div>
                      <Button onClick={() => setScannerOpen(true)} className="gap-2">
                        <ScanLine className="w-4 h-4" />
                        Scan / Search User
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {scannedUserWallet && (
                  <UserValidationCard
                    walletAddress={scannedUserWallet}
                    eventId={eventId}
                    onClose={() => setScannedUserWallet(null)}
                  />
                )}

                <OrganizerChallengeReview eventId={eventId} />

                {event.milestone_enabled && <MilestoneThresholdManager eventId={eventId} onUpdate={fetchEventData} />}

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Event Challenges</CardTitle>
                        <CardDescription>Manage challenges for this event</CardDescription>
                      </div>
                      <CreateEventChallengeDialog eventId={eventId} user={user} onSuccess={fetchEventData}>
                        <Button className="gap-2">
                          <Plus className="w-4 h-4" />
                          Add Challenge
                        </Button>
                      </CreateEventChallengeDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {challenges.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No challenges added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {milestoneChallenges.length > 0 && (
                          <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                              <Target className="w-5 h-5 text-primary" />
                              Milestone Challenges ({milestoneChallenges.length})
                            </h3>
                            <div className="space-y-2">
                              {milestoneChallenges.map((challenge) => (
                                <div
                                  key={challenge.id}
                                  className="p-3 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">{challenge.name}</p>
                                        <Badge variant="outline" className="text-xs">
                                          {challenge.milestone_points}{" "}
                                          {challenge.milestone_points === 1 ? "point" : "points"}
                                        </Badge>
                                        {challenge.milestone_order && (
                                          <Badge variant="secondary" className="text-xs">
                                            Order: {challenge.milestone_order}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {specialChallenges.length > 0 && (
                          <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                              <Star className="w-5 h-5 text-yellow-500" />
                              Special Challenges ({specialChallenges.length})
                            </h3>
                            <div className="space-y-2">
                              {specialChallenges.map((challenge) => (
                                <div
                                  key={challenge.id}
                                  className="p-3 border border-yellow-500/20 rounded-lg bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">{challenge.name}</p>
                                        {challenge.special_max_winners && (
                                          <Badge variant="outline" className="text-xs">
                                            Max {challenge.special_max_winners} winners
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {regularChallenges.length > 0 && (
                          <div>
                            <h3 className="font-semibold flex items-center gap-2 mb-3">
                              <Trophy className="w-5 h-5 text-primary" />
                              Regular Challenges ({regularChallenges.length})
                            </h3>
                            <div className="space-y-2">
                              {regularChallenges.map((challenge) => (
                                <div
                                  key={challenge.id}
                                  className="p-3 border border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <p className="font-medium mb-1">{challenge.name}</p>
                                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {registration && challenges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Challenges</CardTitle>
                  <CardDescription>Complete challenges to earn rewards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {milestoneChallenges.length > 0 && (
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <Target className="w-5 h-5 text-primary" />
                          Milestone Track
                        </h3>
                        <div className="space-y-2">
                          {milestoneChallenges.map((challenge, index) => {
                            const hasSubmitted = userSubmissions.has(challenge.id)
                            return (
                              <div
                                key={challenge.id}
                                className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium mb-1">{challenge.name}</p>
                                    <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {challenge.milestone_points}{" "}
                                        {challenge.milestone_points === 1 ? "point" : "points"}
                                      </Badge>
                                      {hasSubmitted ? (
                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                          Submitted
                                        </Badge>
                                      ) : (
                                        <ChallengeSubmissionDialog
                                          challengeId={challenge.id}
                                          challengeName={challenge.name}
                                          onSuccess={fetchUserData}
                                        >
                                          <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                            Submit
                                          </Button>
                                        </ChallengeSubmissionDialog>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {specialChallenges.length > 0 && (
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <Star className="w-5 h-5 text-yellow-500" />
                          Special Challenges
                        </h3>
                        <div className="space-y-2">
                          {specialChallenges.map((challenge) => {
                            const hasSubmitted = userSubmissions.has(challenge.id)
                            return (
                              <div
                                key={challenge.id}
                                className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/5"
                              >
                                <p className="font-medium mb-1">{challenge.name}</p>
                                <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                                {hasSubmitted ? (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                    Submitted
                                  </Badge>
                                ) : (
                                  <ChallengeSubmissionDialog
                                    challengeId={challenge.id}
                                    challengeName={challenge.name}
                                    onSuccess={fetchUserData}
                                  >
                                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                      Submit
                                    </Button>
                                  </ChallengeSubmissionDialog>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {regularChallenges.length > 0 && (
                      <div>
                        <h3 className="font-semibold flex items-center gap-2 mb-3">
                          <Trophy className="w-5 h-5 text-primary" />
                          Regular Challenges
                        </h3>
                        <div className="space-y-2">
                          {regularChallenges.map((challenge) => {
                            const hasSubmitted = userSubmissions.has(challenge.id)
                            return (
                              <div key={challenge.id} className="p-4 border border-border rounded-lg">
                                <p className="font-medium mb-1">{challenge.name}</p>
                                <p className="text-sm text-muted-foreground mb-2">{challenge.description}</p>
                                {hasSubmitted ? (
                                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                                    Submitted
                                  </Badge>
                                ) : (
                                  <ChallengeSubmissionDialog
                                    challengeId={challenge.id}
                                    challengeName={challenge.name}
                                    onSuccess={fetchUserData}
                                  >
                                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                      Submit
                                    </Button>
                                  </ChallengeSubmissionDialog>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {registration && event?.milestone_enabled && <ParticipantProgressCard eventId={eventId} />}

            <Card className="animate-slide-up animation-delay-200">
              <CardHeader>
                <CardTitle className="text-lg">Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Registered</span>
                  </div>
                  <span className="font-bold">{registrationCount}</span>
                </div>
                {event?.ticket_supply && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ticket className="w-4 h-4" />
                      <span className="text-sm">Capacity</span>
                    </div>
                    <span className="font-bold">{event.ticket_supply}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Challenges</span>
                  </div>
                  <span className="font-bold">{challenges.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <QRScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        eventId={eventId}
        onUserScanned={handleUserScanned}
      />
    </div>
  )
}
