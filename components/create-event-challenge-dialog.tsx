"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Trophy, Star, Target } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CreateEventChallengeDialogProps {
  children: React.ReactNode
  eventId: string
  user: any
  organizerWallet?: string | null
  onSuccess?: () => void
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

export function CreateEventChallengeDialog({
  children,
  eventId,
  user,
  organizerWallet,
  onSuccess,
}: CreateEventChallengeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    challenge_type: "regular" as "milestone" | "special" | "regular",
    milestone_order: "",
    milestone_points: "1",
    special_max_winners: "",
    special_custom_name: "",
    special_custom_description: "",
  })

  const resolvedWallet =
    organizerWallet || user?.sui_wallet_address || user?.wallet_address || user?.organizer_wallet || null

  useEffect(() => {
    if (open && resolvedWallet) {
      void fetchAvailableNFTs(resolvedWallet)
    } else if (open && !resolvedWallet) {
      setAvailableNFTs([])
    }
  }, [open, resolvedWallet])

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
      console.error("[v0] Error fetching available NFTs:", error)
      setAvailableNFTs([])
    }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    console.log("[v0] ðŸš€ handleSubmit called!")
    e.preventDefault()

    if (!user) {
      console.log("[v0] âŒ No user found, aborting")
      return
    }

    console.log("[v0] ðŸ“ Form submitted with data:", formData)
    console.log("[v0] ðŸ“ Selected NFT:", selectedNFT)

    setIsLoading(true)

    const supabase = createClient()

    const challengeData: any = {
      event_id: eventId,
      name: formData.name,
      description: formData.description,
      challenge_type: formData.challenge_type,
      status: "active",
    }

    if (formData.challenge_type === "milestone") {
      challengeData.milestone_order = formData.milestone_order ? Number.parseInt(formData.milestone_order) : null
      challengeData.milestone_points = Number.parseInt(formData.milestone_points)
    }

    if (formData.challenge_type === "special") {
      challengeData.special_prize_nft_id = selectedNFT
      challengeData.special_max_winners = formData.special_max_winners
        ? Number.parseInt(formData.special_max_winners)
        : null
      challengeData.special_custom_name = formData.special_custom_name || null
      challengeData.special_custom_description = formData.special_custom_description || null
    }

    console.log("[v0] ðŸ’¾ Inserting challenge data:", challengeData)

    const { error } = await supabase.from("event_challenges").insert(challengeData)

    if (error) {
      console.error("[v0] âŒ Error creating challenge:", error)
      alert(`Error creating challenge: ${error.message}`)
      setIsLoading(false)
      return
    }

    console.log("[v0] âœ… Challenge created successfully")

    setIsLoading(false)
    setOpen(false)
    resetForm()
    onSuccess?.()
  }

  const resetForm = () => {
    setSelectedNFT(null)
    setFormData({
      name: "",
      description: "",
      challenge_type: "regular",
      milestone_order: "",
      milestone_points: "1",
      special_max_winners: "",
      special_custom_name: "",
      special_custom_description: "",
    })
  }

  const selectedNFTDetails = availableNFTs.find((nft) => nft.id === selectedNFT)
  const selectedStoreItem = selectedNFTDetails?.store_items
  const selectedDisplayName = selectedNFTDetails
    ? selectedNFTDetails.custom_name || selectedStoreItem?.name || "Custom NFT"
    : null
  const selectedImage =
    selectedNFTDetails?.custom_image_url || selectedStoreItem?.image_url || "/placeholder.svg"
  const selectedRank = selectedStoreItem?.rank

  const getChallengeTypeIcon = (type: string) => {
    switch (type) {
      case "milestone":
        return <Target className="w-4 h-4" />
      case "special":
        return <Star className="w-4 h-4" />
      default:
        return <Trophy className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Challenge to Event</DialogTitle>
          <DialogDescription>Create a milestone, special, or regular challenge for participants.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="challenge_type">Challenge Type</Label>
                <Select
                  value={formData.challenge_type}
                  onValueChange={(value: any) => setFormData({ ...formData, challenge_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Milestone Challenge
                      </div>
                    </SelectItem>
                    <SelectItem value="special">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Special Challenge
                      </div>
                    </SelectItem>
                    <SelectItem value="regular">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Regular Challenge
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.challenge_type === "milestone" && "Part of the milestone track with digital stamps"}
                  {formData.challenge_type === "special" && "Bonus challenge with special prize"}
                  {formData.challenge_type === "regular" && "Standalone challenge"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Challenge Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Build a Web App"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what participants need to do..."
                  rows={3}
                  required
                />
              </div>

              {formData.challenge_type === "milestone" && (
                <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Milestone Settings
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="milestone_order">Order (Optional)</Label>
                      <Input
                        id="milestone_order"
                        type="number"
                        min="1"
                        value={formData.milestone_order}
                        onChange={(e) => setFormData({ ...formData, milestone_order: e.target.value })}
                        placeholder="1, 2, 3..."
                      />
                      <p className="text-xs text-muted-foreground">For sequential milestones</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="milestone_points">Points</Label>
                      <Input
                        id="milestone_points"
                        type="number"
                        min="1"
                        value={formData.milestone_points}
                        onChange={(e) => setFormData({ ...formData, milestone_points: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Points toward milestone</p>
                    </div>
                  </div>
                </div>
              )}

              {formData.challenge_type === "special" && (
                <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    Special Challenge Settings
                  </h4>

                  <div className="space-y-2">
                    <Label htmlFor="special_max_winners">Max Winners (Optional)</Label>
                    <Input
                      id="special_max_winners"
                      type="number"
                      min="1"
                      value={formData.special_max_winners}
                      onChange={(e) => setFormData({ ...formData, special_max_winners: e.target.value })}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Prize NFT</Label>
                    {selectedNFTDetails && (
                      <div className="p-3 border border-primary rounded-lg bg-primary/5 mb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={selectedNFTDetails.store_items.image_url || "/placeholder.svg"}
                            alt={selectedNFTDetails.store_items.name}
                            className="w-16 h-16 rounded-md object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-medium">
                              {selectedNFTDetails.custom_name || selectedNFTDetails.store_items.name}
                            </p>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor:
                                  RANK_CONFIG[selectedNFTDetails.store_items.rank as keyof typeof RANK_CONFIG].color,
                              }}
                            >
                              {RANK_CONFIG[selectedNFTDetails.store_items.rank as keyof typeof RANK_CONFIG].name}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {availableNFTs.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                        <p className="text-sm">No NFTs available. Purchase from store first.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {availableNFTs.map((nft) => {
                          const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                          const isSelected = selectedNFT === nft.id
                          return (
                            <button
                              key={nft.id}
                              type="button"
                              onClick={() => setSelectedNFT(nft.id)}
                              className={`p-2 border-2 rounded-lg text-left transition-all hover:scale-105 ${
                                isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                              }`}
                            >
                              <img
                                src={nft.store_items.image_url || "/placeholder.svg"}
                                alt={nft.store_items.name}
                                className="w-full aspect-square object-cover rounded-md mb-2"
                              />
                              <p className="font-medium text-xs truncate">{nft.custom_name || nft.store_items.name}</p>
                              <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                                {rank.name}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="special_custom_name">Custom Prize Name (Optional)</Label>
                    <Input
                      id="special_custom_name"
                      value={formData.special_custom_name}
                      onChange={(e) => setFormData({ ...formData, special_custom_name: e.target.value })}
                      placeholder="e.g., Best Innovation Award"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="special_custom_description">Custom Prize Description (Optional)</Label>
                    <Textarea
                      id="special_custom_description"
                      value={formData.special_custom_description}
                      onChange={(e) => setFormData({ ...formData, special_custom_description: e.target.value })}
                      placeholder="Describe the special prize..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t mt-auto">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (formData.challenge_type === "special" && !selectedNFT)}
              onClick={() => console.log("[v0] ðŸ–±ï¸ Add Challenge button clicked!")}
            >
              {isLoading ? "Creating..." : "Add Challenge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}



