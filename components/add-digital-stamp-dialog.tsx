"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { Stamp, Target, Star, Trophy } from "lucide-react"

interface AddDigitalStampDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  userId: string
  userName: string
  onSuccess: () => void
}

interface EventChallenge {
  id: string
  name: string
  challenge_type: string
  milestone_points: number | null
}

export function AddDigitalStampDialog({
  open,
  onOpenChange,
  eventId,
  userId,
  userName,
  onSuccess,
}: AddDigitalStampDialogProps) {
  const { user } = useWalletAuth()
  const [challenges, setChallenges] = useState<EventChallenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userCompletions, setUserCompletions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      fetchChallenges()
      fetchUserCompletions()
    }
  }, [open, eventId, userId])

  const fetchChallenges = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("event_challenges")
      .select("id, name, challenge_type, milestone_points")
      .eq("event_id", eventId)
      .eq("status", "active")
      .order("challenge_type", { ascending: true })
      .order("milestone_order", { ascending: true })

    setChallenges(data || [])
  }

  const fetchUserCompletions = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("challenge_completions")
      .select("challenge_id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .eq("status", "approved")

    if (data) {
      setUserCompletions(new Set(data.map((c) => c.challenge_id)))
    }
  }

  const handleSubmit = async () => {
    if (!selectedChallenge || !user) return

    setIsLoading(true)

    const supabase = createClient()
    const approverWallet = user.sui_wallet_address || user.wallet_address

    const { error } = await supabase.from("challenge_completions").insert({
      event_id: eventId,
      challenge_id: selectedChallenge,
      user_id: userId,
      approved_by: approverWallet,
      status: "pending",
      completed_at: null,
      notes: notes || null,
    })

    setIsLoading(false)

    if (!error) {
      setSelectedChallenge("")
      setNotes("")
      onSuccess()
    }
  }

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "milestone":
        return <Target className="w-4 h-4 text-primary" />
      case "special":
        return <Star className="w-4 h-4 text-yellow-500" />
      default:
        return <Trophy className="w-4 h-4 text-primary" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="w-5 h-5" />
            Add Digital Stamp
          </DialogTitle>
          <DialogDescription>Mark a challenge as completed for {userName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="challenge">Select Challenge</Label>
            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger id="challenge">
                <SelectValue placeholder="Choose a challenge" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((challenge) => {
                  const isCompleted = userCompletions.has(challenge.id)
                  return (
                    <SelectItem key={challenge.id} value={challenge.id} disabled={isCompleted}>
                      <div className="flex items-center gap-2">
                        {getChallengeIcon(challenge.challenge_type)}
                        <span>{challenge.name}</span>
                        {challenge.milestone_points && (
                          <Badge variant="outline" className="text-xs">
                            {challenge.milestone_points} pts
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedChallenge || isLoading}>
            {isLoading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
