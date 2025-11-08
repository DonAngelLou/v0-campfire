"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase"
import { CheckCircle2, XCircle, ExternalLink, Clock, User } from "lucide-react"
import Link from "next/link"

interface OrganizerChallengeReviewProps {
  eventId: string
}

interface ChallengeSubmission {
  id: string
  user_id: string
  submission_text: string | null
  submission_url: string | null
  status: "pending" | "approved" | "rejected"
  submitted_at: string
  completed_at: string | null
  event_challenges: {
    id: string
    name: string
    challenge_type: string
    milestone_points: number | null
  }
}

export function OrganizerChallengeReview({ eventId }: OrganizerChallengeReviewProps) {
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [eventId])

  const fetchSubmissions = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("challenge_completions")
      .select("*, event_challenges!inner(id, name, challenge_type, milestone_points, event_id)")
      .eq("event_challenges.event_id", eventId)
      .order("submitted_at", { ascending: false })

    setSubmissions((data as any) || [])
    setIsLoading(false)
  }

  const handleApprove = async (submissionId: string) => {
    setProcessingId(submissionId)
    const supabase = createClient()

    const { error } = await supabase
      .from("challenge_completions")
      .update({
        status: "approved",
        completed_at: new Date().toISOString(),
      })
      .eq("id", submissionId)

    if (!error) {
      fetchSubmissions()
    }

    setProcessingId(null)
  }

  const handleReject = async (submissionId: string) => {
    setProcessingId(submissionId)
    const supabase = createClient()

    const { error } = await supabase
      .from("challenge_completions")
      .update({
        status: "rejected",
      })
      .eq("id", submissionId)

    if (!error) {
      fetchSubmissions()
    }

    setProcessingId(null)
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

  const pendingSubmissions = submissions.filter((s) => s.status === "pending")
  const approvedSubmissions = submissions.filter((s) => s.status === "approved")
  const rejectedSubmissions = submissions.filter((s) => s.status === "rejected")

  const SubmissionCard = ({ submission }: { submission: ChallengeSubmission }) => (
    <div className="p-4 border border-border rounded-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{submission.event_challenges.name}</h4>
            <Badge variant="outline" className="text-xs">
              {submission.event_challenges.challenge_type}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="font-mono text-xs">{submission.user_id.slice(0, 8)}...</span>
            <span>•</span>
            <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {submission.submission_text && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm">{submission.submission_text}</p>
        </div>
      )}

      {submission.submission_url && (
        <Link
          href={submission.submission_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View Submission
        </Link>
      )}

      {submission.status === "pending" && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => handleApprove(submission.id)}
            disabled={processingId === submission.id}
            className="flex-1 gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleReject(submission.id)}
            disabled={processingId === submission.id}
            className="flex-1 gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
        </div>
      )}

      {submission.status === "approved" && submission.completed_at && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved on {new Date(submission.completed_at).toLocaleDateString()}</span>
        </div>
      )}

      {submission.status === "rejected" && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" />
          <span>Rejected</span>
        </div>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Challenge Submissions</CardTitle>
        <CardDescription>Review and approve participant submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Approved ({approvedSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="w-4 h-4" />
              Rejected ({rejectedSubmissions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending submissions</p>
              </div>
            ) : (
              pendingSubmissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3 mt-4">
            {approvedSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No approved submissions yet</p>
              </div>
            ) : (
              approvedSubmissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 mt-4">
            {rejectedSubmissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No rejected submissions</p>
              </div>
            ) : (
              rejectedSubmissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
