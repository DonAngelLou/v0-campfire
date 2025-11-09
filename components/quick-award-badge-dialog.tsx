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
import { Award } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useBlockchainTransaction, buildTransferBadgeTransaction } from "@/lib/sui-blockchain"
import { useToast } from "@/hooks/use-toast"
import type { BlockchainToken } from "@/types/blockchain"

interface QuickAwardBadgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  userId: string
  userName: string
  organizerWallet?: string | null
  onSuccess: () => void
}

interface EventChallenge {
  id: string
  name: string
  challenge_type: string
  special_prize_inventory_id: string | null
  organizer_inventory: any
}

interface InventoryItem {
  id: string
  name: string
  image_url: string
  rank: number | null
  quantity: number | null
  awarded_count: number
  is_custom_minted: boolean
  custom_image_url: string | null
  blockchain_tokens?: BlockchainToken[] | null
}

export function QuickAwardBadgeDialog({
  open,
  onOpenChange,
  eventId,
  userId,
  userName,
  organizerWallet,
  onSuccess,
}: QuickAwardBadgeDialogProps) {
  const { user } = useWalletAuth()
  const currentAccount = useCurrentAccount()
  const { executeTransaction } = useBlockchainTransaction()
  const { toast } = useToast()
  const [challenges, setChallenges] = useState<EventChallenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState("")
  const [selectedBadge, setSelectedBadge] = useState("")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const resolvedWallet = organizerWallet || user?.sui_wallet_address || user?.wallet_address || null

  useEffect(() => {
    if (open && user) {
      fetchChallenges()
    }
  }, [open, eventId, user])

  useEffect(() => {
    if (open && resolvedWallet) {
      fetchInventory(resolvedWallet)
    } else if (open) {
      setInventory([])
    }
  }, [open, resolvedWallet])

  const getAvailableTokenCount = (item: InventoryItem) => {
    if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
      return item.blockchain_tokens.filter((token) => token.status === "available").length
    }
    if (typeof item.quantity === "number") {
      return Math.max(item.quantity - (item.awarded_count || 0), 0)
    }
    return 0
  }

  const fetchChallenges = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("event_challenges")
      .select("id, name, challenge_type, special_prize_inventory_id")
      .eq("event_id", eventId)
      .eq("status", "active")

    setChallenges(data || [])
  }

  const fetchInventory = async (wallet: string) => {
    try {
      let data: any[] = []
      if (organizerWallet) {
        const response = await fetch(`/api/organizations/${wallet}/inventory`)
        if (!response.ok) {
          throw new Error("Unable to load organization inventory.")
        }
        data = await response.json()
      } else if (user) {
        const supabase = createClient()
        const { data: supabaseData, error } = await supabase
          .from("organizer_inventory")
          .select(`
            id,
            custom_name,
            custom_description,
            custom_image_url,
            is_custom_minted,
            quantity,
            awarded_count,
            blockchain_tokens,
            store_items(name, image_url, rank)
          `)
          .eq("organizer_wallet", wallet)

        if (error) {
          throw error
        }
        data = supabaseData || []
      }

      const formattedInventory = (data || [])
        .map((item: any) => ({
          id: item.id,
          name: item.custom_name || item.store_items?.name || "Unknown",
          image_url: item.custom_image_url || item.store_items?.image_url || "/placeholder.svg",
          rank: item.store_items?.rank ?? null,
          quantity: item.quantity ?? null,
          awarded_count: item.awarded_count ?? 0,
          is_custom_minted: item.is_custom_minted ?? false,
          custom_image_url: item.custom_image_url ?? null,
          blockchain_tokens: item.blockchain_tokens ?? [],
        }))
        .filter((item: InventoryItem) => getAvailableTokenCount(item) > 0)

      setInventory(formattedInventory)
    } catch (error) {
      console.error("[v0] Inventory fetch error:", error)
      setInventory([])
    }
  }

  const handleSubmit = async () => {
    if (!selectedChallenge || !selectedBadge || !user) return

    if (!currentAccount) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your SUI wallet to award badges.",
        variant: "destructive",
      })
      return
    }

    if (!resolvedWallet) {
      toast({
        title: "No Organizer Wallet",
        description: "Select an organization before awarding NFTs.",
        variant: "destructive",
      })
      return
    }

    const selectedItem = inventory.find((i) => i.id === selectedBadge)
    if (!selectedItem) {
      toast({
        title: "Inventory Error",
        description: "Unable to find the selected badge in your inventory.",
        variant: "destructive",
      })
      return
    }

    const availableToken = (selectedItem.blockchain_tokens || []).find((token) => token.status === "available")
    if (!availableToken) {
      toast({
        title: "No NFTs Available",
        description: "All on-chain badges from this batch have been awarded.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const tx = buildTransferBadgeTransaction({
        badgeObjectId: availableToken.objectId,
        newOwnerAddress: userId,
        salePrice: 0,
      })

      const { digest, success } = await executeTransaction(tx)
      if (!success) {
        throw new Error("Blockchain transaction failed")
      }


      const numericChallengeId = Number(selectedChallenge)
      const parsedChallengeId = Number.isNaN(numericChallengeId) ? null : numericChallengeId
      const awardedByWallet = organizerWallet || user.sui_wallet_address || user.wallet_address

      const awardResponse = await fetch("/api/blockchain/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: selectedBadge,
          recipientWallet: userId,
          awardedBy: awardedByWallet,
          challengeId: parsedChallengeId,
          transactionHash: digest,
          blockchainObjectId: availableToken.objectId,
          eventId,
          notes: notes || null,
        }),
      })

      if (!awardResponse.ok) {
        const error = await awardResponse.json()
        throw new Error(error.error || "Failed to save award")
      }

      toast({
        title: "Badge Awarded",
        description: `${userName} received the badge on-chain.`,
      })

      setSelectedChallenge("")
      setSelectedBadge("")
      setNotes("")
      onSuccess()
    } catch (error: any) {
      console.error("[v0] Quick award error:", error)
      toast({
        title: "Award Failed",
        description: error.message || "Unable to award badge on-chain.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getRankColor = (rank: number | null) => {
    if (!rank) return "#718096"
    switch (rank) {
      case 1:
        return "#805AD5"
      case 2:
        return "#D69E2E"
      case 3:
        return "#38A169"
      case 4:
        return "#4299E1"
      case 5:
        return "#A0AEC0"
      default:
        return "#718096"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Quick Award Badge
          </DialogTitle>
          <DialogDescription>Award a badge to {userName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="challenge">For Challenge</Label>
            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger id="challenge">
                <SelectValue placeholder="Select challenge" />
              </SelectTrigger>
              <SelectContent>
                {challenges.map((challenge) => (
                  <SelectItem key={challenge.id} value={challenge.id}>
                    {challenge.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="badge">Select Badge</Label>
            <Select value={selectedBadge} onValueChange={setSelectedBadge}>
              <SelectTrigger id="badge">
                <SelectValue placeholder="Choose a badge" />
              </SelectTrigger>
              <SelectContent>
                {inventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{
                          backgroundImage: `url(${item.image_url})`,
                          backgroundSize: "cover",
                        }}
                      />
                      <span>{item.name}</span>
                      {item.rank && (
                        <Badge style={{ backgroundColor: getRankColor(item.rank) }} className="text-xs">
                          Rank {item.rank}
                        </Badge>
                      )}
                      {getAvailableTokenCount(item) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {getAvailableTokenCount(item)} left
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a personal message..."
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
          <Button onClick={handleSubmit} disabled={!selectedChallenge || !selectedBadge || isLoading}>
            {isLoading ? "Awarding..." : "Award Badge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
