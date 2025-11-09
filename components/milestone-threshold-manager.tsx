"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Trophy, Plus, X, Target } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface MilestoneThreshold {
  id: string
  points_required: number
  prize_name: string | null
  prize_description: string | null
  display_order: number
  prize_nft_id: string | null
}

interface MilestoneThresholdManagerProps {
  eventId: string
  organizerWallet?: string | null
  onUpdate?: () => void
}

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}

interface InventoryItem {
  id: string
  store_item_id: string | null
  custom_name: string | null
  custom_description: string | null
  custom_image_url?: string | null
  store_items: {
    id: string
    name: string
    rank: number
    image_url: string
  } | null
  quantity?: number | null
  awarded_count?: number | null
  awarded?: boolean | null
  blockchain_tokens?: { status: string }[] | null
}

const hasAvailableSupply = (item: InventoryItem) => {
  if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
    return item.blockchain_tokens.some((token) => token.status === "available")
  }
  if (typeof item.quantity === "number" && typeof item.awarded_count === "number") {
    return item.quantity > item.awarded_count
  }
  if (typeof item.awarded === "boolean") {
    return item.awarded === false
  }
  return true
}

export function MilestoneThresholdManager({ eventId, organizerWallet, onUpdate }: MilestoneThresholdManagerProps) {
  const { user } = useAuth()
  const [thresholds, setThresholds] = useState<MilestoneThreshold[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    points_required: "",
    prize_name: "",
    prize_description: "",
  })

  useEffect(() => {
    fetchThresholds()
  }, [eventId])

  const resolvedWallet =
    organizerWallet || user?.sui_wallet_address || user?.wallet_address || user?.organizer_wallet || null

  useEffect(() => {
    if (open && resolvedWallet) {
      void fetchAvailableNFTs(resolvedWallet)
    } else if (open && !resolvedWallet) {
      setAvailableNFTs([])
    }
  }, [open, resolvedWallet])

  const fetchThresholds = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("milestone_thresholds")
      .select("*")
      .eq("event_id", eventId)
      .order("points_required", { ascending: true })

    setThresholds(data || [])
  }

  const fetchAvailableNFTs = async (wallet: string) => {
    try {
      let inventoryData: InventoryItem[] = []

      if (organizerWallet) {
        const response = await fetch(`/api/organizations/${wallet}/inventory`)
        if (!response.ok) {
          throw new Error("Unable to load organization inventory.")
        }
        inventoryData = await response.json()
      } else if (user) {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("organizer_inventory")
          .select("*, store_items(*)")
          .eq("organizer_wallet", wallet)

        if (error) {
          throw error
        }
        inventoryData = (data as InventoryItem[]) || []
      }

      setAvailableNFTs(inventoryData.filter(hasAvailableSupply))
    } catch (error) {
      console.error("[v0] Error loading available NFTs:", error)
      setAvailableNFTs([])
    }
  }

  const handleAddThreshold = async () => {
    if (!formData.points_required || !selectedNFT) return

    setIsLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from("milestone_thresholds").insert({
      event_id: eventId,
      points_required: Number.parseInt(formData.points_required),
      prize_nft_id: selectedNFT,
      prize_name: formData.prize_name || null,
      prize_description: formData.prize_description || null,
      display_order: thresholds.length,
    })

    if (!error) {
      fetchThresholds()
      setFormData({ points_required: "", prize_name: "", prize_description: "" })
      setSelectedNFT(null)
      setOpen(false)
      onUpdate?.()
    }

    setIsLoading(false)
  }

  const handleDeleteThreshold = async (id: string) => {
    const supabase = createClient()
    await supabase.from("milestone_thresholds").delete().eq("id", id)
    fetchThresholds()
    onUpdate?.()
  }

  const selectedNFTDetails = availableNFTs.find((nft) => nft.id === selectedNFT)
  const selectedStoreItem = selectedNFTDetails?.store_items
  const selectedDisplayName = selectedNFTDetails
    ? selectedNFTDetails.custom_name || selectedStoreItem?.name || "Custom NFT"
    : null
  const selectedImage =
    selectedNFTDetails?.custom_image_url || selectedStoreItem?.image_url || "/placeholder.svg"
  const selectedRank = selectedStoreItem?.rank

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Milestone Thresholds
            </CardTitle>
            <CardDescription>Set completion rewards for milestone challenges</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Threshold
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone Threshold</DialogTitle>
                <DialogDescription>Set a completion threshold and reward for participants</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="points_required">Points Required</Label>
                  <Input
                    id="points_required"
                    type="number"
                    min="1"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                    placeholder="e.g., 3"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Number of milestone challenges to complete</p>
                </div>

                <div className="space-y-2">
                  <Label>Select Prize NFT</Label>
                  {selectedNFTDetails && selectedDisplayName && (
                    <div className="p-3 border border-primary rounded-lg bg-primary/5 mb-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedImage}
                          alt={selectedDisplayName}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{selectedDisplayName}</p>
                          {selectedRank ? (
                            <Badge
                              variant="outline"
                              style={{ borderColor: RANK_CONFIG[selectedRank as keyof typeof RANK_CONFIG].color }}
                            >
                              {RANK_CONFIG[selectedRank as keyof typeof RANK_CONFIG].name}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Custom Mint</Badge>
                          )}
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedNFT(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {availableNFTs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                      <p className="text-sm">No NFTs available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {availableNFTs.map((nft) => {
                        const storeItem = nft.store_items
                        const rank = storeItem ? RANK_CONFIG[storeItem.rank as keyof typeof RANK_CONFIG] : null
                        const isSelected = selectedNFT === nft.id
                        const name = nft.custom_name || storeItem?.name || "Custom NFT"
                        const image = nft.custom_image_url || storeItem?.image_url || "/placeholder.svg"
                        return (
                          <button
                            key={nft.id}
                            type="button"
                            onClick={() => setSelectedNFT(nft.id)}
                            className={`p-2 border-2 rounded-lg text-left transition-all hover:scale-105 ${
                              isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <img src={image} alt={name} className="w-full aspect-square object-cover rounded-md mb-2" />
                            <p className="font-medium text-xs truncate">{name}</p>
                            {rank ? (
                              <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                                {rank.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs mt-1">
                                Custom Mint
                              </Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_name">Custom Prize Name (Optional)</Label>
                  <Input
                    id="prize_name"
                    value={formData.prize_name}
                    onChange={(e) => setFormData({ ...formData, prize_name: e.target.value })}
                    placeholder="e.g., Bronze Achievement"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prize_description">Prize Description (Optional)</Label>
                  <Textarea
                    id="prize_description"
                    value={formData.prize_description}
                    onChange={(e) => setFormData({ ...formData, prize_description: e.target.value })}
                    placeholder="Describe the achievement..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddThreshold} disabled={isLoading || !selectedNFT || !formData.points_required}>
                  {isLoading ? "Adding..." : "Add Threshold"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {thresholds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No milestone thresholds set yet</p>
            <p className="text-xs">Add thresholds to reward participants for completing challenges</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thresholds.map((threshold) => (
              <div
                key={threshold.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    {threshold.points_required}
                  </div>
                  <div>
                    <p className="font-medium">
                      {threshold.prize_name || `${threshold.points_required} Points Reward`}
                    </p>
                    {threshold.prize_description && (
                      <p className="text-sm text-muted-foreground">{threshold.prize_description}</p>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteThreshold(threshold.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
