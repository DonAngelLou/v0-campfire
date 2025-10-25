"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { AwardIcon, Loader2 } from "lucide-react"

interface Award {
  id: number
  awarded_at: string
  challenges: {
    id: number
    name: string
    image_url: string | null
  }
}

interface TagInfluencerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  influencerWallet: string
  influencerName: string
  onSuccess?: () => void
}

export function TagInfluencerDialog({
  open,
  onOpenChange,
  influencerWallet,
  influencerName,
  onSuccess,
}: TagInfluencerDialogProps) {
  const { user } = useAuth()
  const [myAwards, setMyAwards] = useState<Award[]>([])
  const [selectedAwardId, setSelectedAwardId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && user) {
      fetchMyAwards()
    }
  }, [open, user])

  const fetchMyAwards = async () => {
    if (!user) return

    setIsLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("awards")
      .select(
        `
        id,
        awarded_at,
        challenges(id, name, image_url)
      `,
      )
      .eq("recipient_wallet", user.wallet_address)
      .order("awarded_at", { ascending: false })

    setMyAwards(data || [])
    setIsLoading(false)
  }

  const handleSubmit = async () => {
    if (!user || !selectedAwardId) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from("influences").insert({
      influencer_wallet: influencerWallet,
      influenced_wallet: user.wallet_address,
      award_id: selectedAwardId,
      status: "pending",
    })

    setIsSubmitting(false)

    if (!error) {
      onOpenChange(false)
      setSelectedAwardId(null)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tag {influencerName} as Influencer</DialogTitle>
          <DialogDescription>
            Select which badge this person influenced you to earn. They will need to approve this connection.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : myAwards.length === 0 ? (
          <div className="text-center py-12">
            <AwardIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">You haven't earned any badges yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select a badge:</p>
            <div className="grid md:grid-cols-2 gap-4">
              {myAwards.map((award) => (
                <Card
                  key={award.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedAwardId === award.id
                      ? "border-primary ring-2 ring-primary"
                      : "hover:border-primary hover:shadow-lg"
                  }`}
                  onClick={() => setSelectedAwardId(award.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={
                            award.challenges.image_url ||
                            `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(award.challenges.name + " badge") || "/placeholder.svg"}`
                          }
                          alt={award.challenges.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{award.challenges.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(award.awarded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!selectedAwardId || isSubmitting}>
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
        )}
      </DialogContent>
    </Dialog>
  )
}
