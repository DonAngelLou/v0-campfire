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

interface QuickAwardBadgeDialogProps {
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
}

export function QuickAwardBadgeDialog({
  open,
  onOpenChange,
  eventId,
  userId,
  userName,
  onSuccess,
}: QuickAwardBadgeDialogProps) {
  const { user } = useWalletAuth()
  const [challenges, setChallenges] = useState<EventChallenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState("")
  const [selectedBadge, setSelectedBadge] = useState("")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && user) {
      fetchChallenges()
      fetchInventory()
    }
  }, [open, eventId, user])

  const fetchChallenges = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("event_challenges")
      .select("id, name, challenge_type, special_prize_inventory_id")
      .eq("event_id", eventId)
      .eq("status", "active")

    setChallenges(data || [])
  }

  const fetchInventory = async () => {
    if (!user) return

    const supabase = createClient()
    const userWallet = user.sui_wallet_address || user.wallet_address

    const { data } = await supabase
      .from("organizer_inventory")
      .select(`
        id,
        custom_name,
        custom_description,
        custom_image_url,
        is_custom_minted,
        quantity,
        awarded_count,
        store_items(name, image_url, rank)
      `)
      .eq("organizer_wallet", userWallet)

    const formattedInventory = (data || [])
      .map((item: any) => ({
        id: item.id,
        name: item.custom_name || item.store_items?.name || "Unknown",
        image_url: item.custom_image_url || item.store_items?.image_url || "/placeholder.svg",
        rank: item.store_items?.rank || null,
        quantity: item.quantity,
        awarded_count: item.awarded_count,
        is_custom_minted: item.is_custom_minted || false,
        custom_image_url: item.custom_image_url,
      }))
      .filter((item: InventoryItem) => {
        // Show if not quantity-tracked (old system) or has available quantity
        return !item.quantity || item.quantity - item.awarded_count > 0
      })

    setInventory(formattedInventory)
  }

  const handleSubmit = async () => {
    if (!selectedChallenge || !selectedBadge || !user) return

    setIsLoading(true)

    const supabase = createClient()
    const awarderWallet = user.sui_wallet_address || user.wallet_address

    // Insert award
    const { error: awardError } = await supabase.from("awards").insert({
      challenge_id: Number.parseInt(selectedChallenge),
      recipient_wallet: userId,
      awarded_by: awarderWallet,
      inventory_id: selectedBadge,
      notes: notes || null,
      event_id: eventId,
    })

    if (!awardError) {
      // Update inventory count
      const selectedItem = inventory.find((i) => i.id === selectedBadge)
      if (selectedItem && selectedItem.quantity) {
        await supabase
          .from("organizer_inventory")
          .update({ awarded_count: selectedItem.awarded_count + 1 })
          .eq("id", selectedBadge)
      }
    }

    setIsLoading(false)

    if (!awardError) {
      setSelectedChallenge("")
      setSelectedBadge("")
      setNotes("")
      onSuccess()
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
                      {item.quantity && (
                        <Badge variant="outline" className="text-xs">
                          {item.quantity - item.awarded_count} left
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
