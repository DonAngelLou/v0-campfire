"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { CheckCircle2 } from "lucide-react"

interface ChallengeSubmissionDialogProps {
  children: React.ReactNode
  challengeId: string
  challengeName: string
  onSuccess?: () => void
}

export function ChallengeSubmissionDialog({
  children,
  challengeId,
  challengeName,
  onSuccess,
}: ChallengeSubmissionDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    submission_text: "",
    submission_url: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)

    const supabase = createClient()

    const { error } = await supabase.from("challenge_completions").insert({
      challenge_id: challengeId,
      user_id: user.wallet_address,
      submission_text: formData.submission_text || null,
      submission_url: formData.submission_url || null,
      status: "pending",
    })

    if (error) {
      console.error("[v0] Error submitting challenge:", error)
      setIsLoading(false)
      return
    }

    console.log("[v0] Challenge submitted successfully")

    setIsLoading(false)
    setOpen(false)
    setFormData({ submission_text: "", submission_url: "" })
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Challenge</DialogTitle>
          <DialogDescription>Submit your completion for: {challengeName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="submission_text">Description</Label>
            <Textarea
              id="submission_text"
              value={formData.submission_text}
              onChange={(e) => setFormData({ ...formData, submission_text: e.target.value })}
              placeholder="Describe what you did to complete this challenge..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submission_url">Proof URL (Optional)</Label>
            <Input
              id="submission_url"
              type="url"
              value={formData.submission_url}
              onChange={(e) => setFormData({ ...formData, submission_url: e.target.value })}
              placeholder="https://github.com/yourproject or https://yourdemo.com"
            />
            <p className="text-xs text-muted-foreground">Link to your project, demo, or proof of completion</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {isLoading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
