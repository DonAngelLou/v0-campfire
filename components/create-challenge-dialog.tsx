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
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { X, Package } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { BlockchainToken } from "@/types/blockchain"

interface CreateChallengeDialogProps {
  children: React.ReactNode
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
  id: number
  store_item_id: number
  custom_name: string | null
  custom_description: string | null
  custom_image_url?: string | null
  purchased_at: string
  is_custom_minted?: boolean | null
  quantity?: number | null
  awarded_count?: number | null
  blockchain_tokens?: BlockchainToken[] | null
  store_items: {
    name: string
    rank: number
    image_url: string
  } | null
}

const hasAvailableSupply = (item: InventoryItem) => {
  if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
    return item.blockchain_tokens.some((token) => token.status === "available")
  }
  if (typeof item.quantity === "number" && typeof item.awarded_count === "number") {
    return item.quantity > item.awarded_count
  }
  return !(item as any).awarded
}

export function CreateChallengeDialog({ children, organizerWallet, onSuccess }: CreateChallengeDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // Added multi-step form
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteria: "",
    status: "open" as "open" | "closed" | "completed",
  })

  const resolvedWallet = organizerWallet || user?.sui_wallet_address || user?.wallet_address || null

  useEffect(() => {
    if (open && resolvedWallet) {
      void fetchAvailableNFTs(resolvedWallet)
    } else if (open) {
      setAvailableNFTs([])
      setSelectedNFTs([])
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

      const filtered = inventoryData.filter(hasAvailableSupply)
      setAvailableNFTs(filtered)
      setSelectedNFTs((prev) => prev.filter((id) => filtered.some((item) => item.id === id)))
    } catch (error) {
      console.error("[v0] Error fetching available NFTs:", error)
      setAvailableNFTs([])
      setSelectedNFTs([])
    }
  }

  const toggleNFTSelection = (nftId: number) => {
    setSelectedNFTs((prev) => (prev.includes(nftId) ? prev.filter((id) => id !== nftId) : [...prev, nftId]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || selectedNFTs.length === 0) return

    setIsLoading(true)

    const supabase = createClient()

    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .insert({
        name: formData.name,
        description: formData.description,
        criteria: formData.criteria,
        status: formData.status,
        created_by: user.wallet_address,
      })
      .select()
      .single()

    if (challengeError || !challenge) {
      console.error("[v0] Error creating challenge:", challengeError)
      setIsLoading(false)
      return
    }

    const { error: linkError } = await supabase
      .from("organizer_inventory")
      .update({ challenge_id: challenge.id })
      .in("id", selectedNFTs)

    if (linkError) {
      console.error("[v0] Error linking NFTs to challenge:", linkError)
    }

    console.log("[v0] Challenge created successfully with", selectedNFTs.length, "NFTs allocated")

    setIsLoading(false)
    setOpen(false)
    setStep(1)
    setSelectedNFTs([])
    setFormData({
      name: "",
      description: "",
      criteria: "",
      status: "open",
    })
    onSuccess?.()
  }

  const selectedNFTDetails = availableNFTs.filter((nft) => selectedNFTs.includes(nft.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Challenge</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Create a challenge for users to apply to and earn badges."
              : "Select NFT badges to award for this challenge."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Challenge Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Web Development Bootcamp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this challenge is about..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criteria">Criteria</Label>
                  <Textarea
                    id="criteria"
                    value={formData.criteria}
                    onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                    placeholder="What are the requirements to earn this badge?"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {selectedNFTs.length > 0 && (
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Selected NFTs ({selectedNFTs.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNFTDetails.map((nft) => {
                        const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                        return (
                          <Badge
                            key={nft.id}
                            variant="secondary"
                            className="gap-1 pr-1"
                            style={{ borderColor: rank.color }}
                          >
                            {nft.custom_name || nft.store_items.name}
                            <button
                              type="button"
                              onClick={() => toggleNFTSelection(nft.id)}
                              className="ml-1 hover:bg-background/50 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <Label>Available NFTs in Inventory</Label>
                  {availableNFTs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No NFTs available in inventory.</p>
                      <p className="text-sm">Purchase NFTs from the store first.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {availableNFTs.map((nft) => {
                        const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                        const isSelected = selectedNFTs.includes(nft.id)
                        return (
                          <button
                            key={nft.id}
                            type="button"
                            onClick={() => toggleNFTSelection(nft.id)}
                            className={`p-3 border-2 rounded-lg text-left transition-all hover:scale-105 ${
                              isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <img
                              src={nft.store_items.image_url || "/placeholder.svg"}
                              alt={nft.store_items.name}
                              className="w-full aspect-square object-cover rounded-md mb-2"
                            />
                            <p className="font-medium text-sm truncate">{nft.custom_name || nft.store_items.name}</p>
                            <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                              {rank.name}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t mt-auto">
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.description || !formData.criteria}
              >
                Next: Select NFTs
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                Back
              </Button>
              <Button type="submit" onClick={handleSubmit} disabled={isLoading || selectedNFTs.length === 0}>
                {isLoading ? "Creating..." : `Create Challenge (${selectedNFTs.length} NFTs)`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
