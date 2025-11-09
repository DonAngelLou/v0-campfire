"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle2, XCircle, Award, Stamp, User, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { AddDigitalStampDialog } from "@/components/add-digital-stamp-dialog"
import { QuickAwardBadgeDialog } from "@/components/quick-award-badge-dialog"

interface UserValidationCardProps {
  walletAddress: string
  eventId: string
  organizerWallet?: string | null
  onClose: () => void
}

interface UserData {
  wallet_address: string
  sui_wallet_address: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
}

interface RegistrationData {
  id: string
  status: string
  registration_date: string
  payment_status: string
}

interface ProgressData {
  total_completions: number
  approved_completions: number
  points_earned: number
  eligible_rewards: Array<{
    threshold_id: string
    points_required: number
    prize_name: string
  }>
}

export function UserValidationCard({ walletAddress, eventId, organizerWallet, onClose }: UserValidationCardProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [registration, setRegistration] = useState<RegistrationData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stampDialogOpen, setStampDialogOpen] = useState(false)
  const [awardDialogOpen, setAwardDialogOpen] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [walletAddress, eventId])

  const fetchUserData = async () => {
    const supabase = createClient()

    // Fetch user info
    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .or(`wallet_address.eq.${walletAddress},sui_wallet_address.eq.${walletAddress}`)
      .single()

    if (!userData) {
      setIsLoading(false)
      return
    }

    setUser(userData)
    const userWallet = userData.sui_wallet_address || userData.wallet_address

    // Check registration
    const { data: regData } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("user_id", userWallet)
      .single()

    setRegistration(regData)

    // Fetch progress
    const { data: completions } = await supabase
      .from("challenge_completions")
      .select("*, event_challenges!inner(milestone_points, challenge_type, event_id)")
      .eq("user_id", userWallet)
      .eq("event_challenges.event_id", eventId)

    const approvedCompletions = completions?.filter((c) => c.status === "approved") || []
    const pointsEarned = approvedCompletions
      .filter((c) => c.event_challenges.challenge_type === "milestone")
      .reduce((sum, c) => sum + (c.event_challenges.milestone_points || 0), 0)

    // Check eligible rewards
    const { data: thresholds } = await supabase
      .from("milestone_thresholds")
      .select("id, points_required, prize_name")
      .eq("event_id", eventId)
      .lte("points_required", pointsEarned)
      .order("points_required", { ascending: false })

    setProgress({
      total_completions: completions?.length || 0,
      approved_completions: approvedCompletions.length,
      points_earned: pointsEarned,
      eligible_rewards: thresholds || [],
    })

    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={onClose} className="mt-4 bg-transparent">
            Close
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isRegistered = registration?.status === "registered"

  return (
    <>
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Validation
          </CardTitle>
          <CardDescription>Review user status and take action</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-muted/50">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.display_name} />
              <AvatarFallback>{user.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{user.display_name}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
              </p>
            </div>
          </div>

          {/* Registration Status */}
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Event Registration</span>
              {isRegistered ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Registered
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="w-3 h-3" />
                  Not Registered
                </Badge>
              )}
            </div>
            {registration && (
              <p className="text-sm text-muted-foreground">
                Registered on {new Date(registration.registration_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Progress Stats */}
          {progress && isRegistered && (
            <div className="p-4 border border-border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                Challenge Progress
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{progress.points_earned}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress.approved_completions}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress.total_completions}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              {progress.eligible_rewards.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-medium mb-2">Eligible for Rewards:</p>
                  <div className="space-y-1">
                    {progress.eligible_rewards.map((reward) => (
                      <div key={reward.threshold_id} className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        {reward.prize_name} ({reward.points_required} points)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {isRegistered && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button onClick={() => setStampDialogOpen(true)} className="gap-2" variant="outline">
                <Stamp className="w-4 h-4" />
                Add Stamp
              </Button>
              <Button onClick={() => setAwardDialogOpen(true)} className="gap-2">
                <Award className="w-4 h-4" />
                Award Badge
              </Button>
            </div>
          )}

          <Button variant="outline" onClick={onClose} className="w-full bg-transparent">
            Close
          </Button>
        </CardContent>
      </Card>

      <AddDigitalStampDialog
        open={stampDialogOpen}
        onOpenChange={setStampDialogOpen}
        eventId={eventId}
        userId={user.sui_wallet_address || user.wallet_address}
        userName={user.display_name}
        onSuccess={() => {
          setStampDialogOpen(false)
          fetchUserData()
        }}
      />

      <QuickAwardBadgeDialog
        open={awardDialogOpen}
        onOpenChange={setAwardDialogOpen}
        eventId={eventId}
        userId={user.sui_wallet_address || user.wallet_address}
        userName={user.display_name}
        organizerWallet={organizerWallet}
        onSuccess={() => {
          setAwardDialogOpen(false)
          fetchUserData()
        }}
      />
    </>
  )
}
