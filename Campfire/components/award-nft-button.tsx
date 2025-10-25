"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Trophy, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}

interface Application {
  id: number
  applicant_wallet: string
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
}

interface InventoryItem {
  id: number
  custom_name: string | null
  store_items: {
    name: string
    rank: number
    image_url: string
  }
}

interface AwardNFTButtonProps {
  application: Application
  challengeId: number
  onSuccess?: () => void
}

export function AwardNFTButton({ application, challengeId, onSuccess }: AwardNFTButtonProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchAvailableNFTs()
    }
  }, [open])

  const fetchAvailableNFTs = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("organizer_inventory")
      .select("*, store_items(*)")
      .eq("challenge_id", challengeId)
      .is("awarded_to", null)

    if (data) setAvailableNFTs(data)
  }

  const handleAward = async () => {
    if (!user || !selectedNFT) return

    setIsLoading(true)

    const supabase = createClient()

    // Create award
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .insert({
        challenge_id: challengeId,
        recipient_wallet: application.applicant_wallet,
        awarded_by: user.wallet_address,
        notes: `Challenge completion award`,
        inventory_id: selectedNFT,
      })
      .select()
      .single()

    if (!awardError && award) {
      // Mark NFT as awarded
      await supabase
        .from("organizer_inventory")
        .update({
          awarded: true,
          awarded_to: application.applicant_wallet,
          awarded_at: new Date().toISOString(),
        })
        .eq("id", selectedNFT)
    }

    setIsLoading(false)
    setOpen(false)
    setSelectedNFT(null)

    if (!awardError) {
      const { data: remainingNFTs } = await supabase
        .from("organizer_inventory")
        .select("id")
        .eq("challenge_id", challengeId)
        .is("awarded_to", null)

      if (remainingNFTs && remainingNFTs.length === 0) {
        // Trigger NFT depletion dialog
        onSuccess?.()
        // Dispatch custom event to show depletion dialog
        window.dispatchEvent(new CustomEvent("nfts-depleted", { detail: { challengeId } }))
      } else {
        onSuccess?.()
      }
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Trophy className="w-4 h-4" />
        Award NFT
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Award NFT to {application.users.display_name}</DialogTitle>
            <DialogDescription>Select an NFT badge from this challenge to award</DialogDescription>
          </DialogHeader>

          {availableNFTs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No NFTs available to award. All badges for this challenge have been distributed.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {availableNFTs.map((nft) => {
                  const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                  return (
                    <button
                      key={nft.id}
                      type="button"
                      onClick={() => setSelectedNFT(nft.id)}
                      className={`p-2 border-2 rounded-lg transition-all hover:scale-105 ${
                        selectedNFT === nft.id ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <img
                        src={nft.store_items.image_url || "/placeholder.svg"}
                        alt={nft.store_items.name}
                        className="w-full aspect-square object-cover rounded-md mb-1"
                      />
                      <p className="text-xs font-medium truncate">{nft.custom_name || nft.store_items.name}</p>
                      <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                        {rank.name}
                      </Badge>
                    </button>
                  )
                })}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAward} disabled={!selectedNFT || isLoading}>
                  {isLoading ? "Awarding..." : "Confirm Award"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
