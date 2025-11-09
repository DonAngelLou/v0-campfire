"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Trophy, Target, CheckCircle2, Clock, XCircle } from "lucide-react"

interface ParticipantProgressCardProps {
  eventId: string
}

interface MilestoneProgress {
  total_challenges: number
  completed_challenges: number
  points_earned: number
  next_threshold: {
    points_required: number
    prize_name: string | null
  } | null
}

interface ChallengeCompletion {
  id: string
  challenge_id: string
  status: "pending" | "approved" | "rejected"
  completed_at: string | null
  event_challenges: {
    name: string
    challenge_type: string
    milestone_points: number | null
  }
}

export function ParticipantProgressCard({ eventId }: ParticipantProgressCardProps) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<MilestoneProgress | null>(null)
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProgress()
    }
  }, [eventId, user])

  const fetchProgress = async () => {
    if (!user) return

    const supabase = createClient()

    // Fetch only approved challenge completions for this event
    const { data: completionsData } = await supabase
      .from("challenge_completions")
      .select("*, event_challenges(name, challenge_type, milestone_points, event_id)")
      .eq("user_id", user.wallet_address)
      .eq("event_challenges.event_id", eventId)
      .eq("status", "approved")

    const filteredCompletions = (completionsData || []).filter((c) => c.event_challenges !== null)
    setCompletions(filteredCompletions)

    // Calculate milestone progress only from approved entries
    const milestoneCompletions = filteredCompletions.filter(
      (c) => c.event_challenges.challenge_type === "milestone",
    )

    const pointsEarned = milestoneCompletions.reduce((sum, c) => sum + (c.event_challenges.milestone_points || 0), 0)

    // Get total milestone challenges
    const { count: totalMilestones } = await supabase
      .from("event_challenges")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("challenge_type", "milestone")
      .eq("status", "active")

    // Get next threshold
    const { data: nextThreshold } = await supabase
      .from("milestone_thresholds")
      .select("points_required, prize_name")
      .eq("event_id", eventId)
      .gt("points_required", pointsEarned)
      .order("points_required", { ascending: true })
      .limit(1)
      .single()

    setProgress({
      total_challenges: totalMilestones || 0,
      completed_challenges: milestoneCompletions.length,
      points_earned: pointsEarned,
      next_threshold: nextThreshold || null,
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

  if (!progress) return null

  const progressPercentage = progress.next_threshold
    ? (progress.points_earned / progress.next_threshold.points_required) * 100
    : 100

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Approved</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Your Progress
          </CardTitle>
          <CardDescription>Track your milestone completion and rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Milestone Points</span>
              <span className="font-bold text-lg text-primary">{progress.points_earned}</span>
            </div>

            {progress.next_threshold && (
              <>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Next reward at {progress.next_threshold.points_required} points</span>
                  <span>{progress.next_threshold.points_required - progress.points_earned} points to go</span>
                </div>
                {progress.next_threshold.prize_name && (
                  <div className="p-3 border border-primary/20 rounded-lg bg-primary/5 mt-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Next Reward: {progress.next_threshold.prize_name}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {!progress.next_threshold && progress.points_earned > 0 && (
              <div className="p-3 border border-green-500/20 rounded-lg bg-green-500/5 mt-2">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    All milestones completed! 🎉
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{progress.completed_challenges}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{completions.length}</p>
                <p className="text-xs text-muted-foreground">Total Submissions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {completions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completions.slice(0, 5).map((completion) => (
                <div
                  key={completion.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(completion.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{completion.event_challenges.name}</p>
                      {completion.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(completion.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(completion.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
