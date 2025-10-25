"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface TagBadgeInfluencerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  awardId: number
  badgeName: string
  onSuccess?: () => void
}

export function TagBadgeInfluencerDialog({
  open,
  onOpenChange,
  awardId,
  badgeName,
  onSuccess,
}: TagBadgeInfluencerDialogProps) {
  const { user } = useAuth()
  const [influencerWallet, setInfluencerWallet] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!user || !influencerWallet.trim()) return

    setIsSubmitting(true)
    setError("")
    const supabase = createClient()

    // Check if influencer exists
    const { data: influencerData } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("wallet_address", influencerWallet.trim())
      .single()

    if (!influencerData) {
      setError("User not found. Please check the wallet address.")
      setIsSubmitting(false)
      return
    }

    // Check if already tagged
    const { data: existingInfluence } = await supabase
      .from("influences")
      .select("*")
      .eq("influencer_wallet", influencerWallet.trim())
      .eq("influenced_wallet", user.wallet_address)
      .eq("award_id", awardId)
      .single()

    if (existingInfluence) {
      setError("You've already tagged this person as an influencer for this badge.")
      setIsSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from("influences").insert({
      influencer_wallet: influencerWallet.trim(),
      influenced_wallet: user.wallet_address,
      award_id: awardId,
      status: "pending",
    })

    setIsSubmitting(false)

    if (!insertError) {
      onOpenChange(false)
      setInfluencerWallet("")
      setError("")
      onSuccess?.()
    } else {
      setError("Failed to submit request. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag Influencer for {badgeName}</DialogTitle>
          <DialogDescription>
            Enter the wallet address of the person who influenced you to earn this badge. They will need to approve this
            connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet">Influencer Wallet Address</Label>
            <Input
              id="wallet"
              placeholder="e.g., alice.eth"
              value={influencerWallet}
              onChange={(e) => {
                setInfluencerWallet(e.target.value)
                setError("")
              }}
              disabled={isSubmitting}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setInfluencerWallet("")
                setError("")
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!influencerWallet.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
