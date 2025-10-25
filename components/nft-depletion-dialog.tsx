"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Package, CheckCircle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
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

interface NFTDepletionDialogProps {
  challengeId: number
  onAddNFTs?: () => void
  onMarkCompleted?: () => void
}

export function NFTDepletionDialog({ challengeId, onAddNFTs, onMarkCompleted }: NFTDepletionDialogProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([])
  const [selectedNFTs, setSelectedNFTs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAddNFTs, setShowAddNFTs] = useState(false)

  useEffect(() => {
    // Listen for NFT depletion event
    const handleDepletion = (event: CustomEvent) => {
      if (event.detail.challengeId === challengeId) {
        setOpen(true)
        fetchAvailableInventory()
      }
    }

    window.addEventListener("nfts-depleted" as any, handleDepletion as any)
    return () => window.removeEventListener("nfts-depleted" as any, handleDepletion as any)
  }, [challengeId])

  const fetchAvailableInventory = async () => {
    if (!user) return

    const supabase = createClient()

    const { data } = await supabase
      .from("organizer_inventory")
      .select("*, store_items(*)")
      .eq("organizer_wallet", user.wallet_address)
      .is("challenge_id", null)
      .eq("awarded", false)

    if (data) {
      setAvailableInventory(data)
    }
  }

  const toggleNFTSelection = (nftId: number) => {
    setSelectedNFTs((prev) => (prev.includes(nftId) ? prev.filter((id) => id !== nftId) : [...prev, nftId]))
  }

  const handleAddNFTs = async () => {
    if (selectedNFTs.length === 0) return

    setIsLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from("organizer_inventory")
      .update({ challenge_id: challengeId })
      .in("id", selectedNFTs)

    setIsLoading(false)

    if (!error) {
      setOpen(false)
      setShowAddNFTs(false)
      setSelectedNFTs([])
      onAddNFTs?.()
    }
  }

  const handleMarkCompleted = async () => {
    setIsLoading(true)

    const supabase = createClient()

    const { error } = await supabase.from("challenges").update({ status: "completed" }).eq("id", challengeId)

    setIsLoading(false)

    if (!error) {
      setOpen(false)
      onMarkCompleted?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            All NFTs Have Been Awarded
          </DialogTitle>
          <DialogDescription>
            You've awarded all NFT badges allocated to this challenge. What would you like to do next?
          </DialogDescription>
        </DialogHeader>

        {!showAddNFTs ? (
          <div className="space-y-4 py-4">
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                {availableInventory.length > 0
                  ? `You have ${availableInventory.length} NFT${availableInventory.length > 1 ? "s" : ""} available in your inventory.`
                  : "You have no NFTs available in your inventory. Visit the store to purchase more."}
              </AlertDescription>
            </Alert>

            <div className="grid gap-3">
              {availableInventory.length > 0 && (
                <Button
                  variant="default"
                  className="w-full justify-start h-auto py-4"
                  onClick={() => setShowAddNFTs(true)}
                >
                  <Package className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Add NFTs from Inventory</div>
                    <div className="text-sm text-muted-foreground">
                      Select NFTs to add to this challenge and continue awarding
                    </div>
                  </div>
                </Button>
              )}

              {availableInventory.length === 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 bg-transparent"
                  onClick={() => {
                    setOpen(false)
                    router.push("/store")
                  }}
                >
                  <Package className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Visit Store</div>
                    <div className="text-sm text-muted-foreground">Purchase more NFT badges to award</div>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4 bg-transparent"
                onClick={handleMarkCompleted}
                disabled={isLoading}
              >
                <CheckCircle className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Mark Challenge as Completed</div>
                  <div className="text-sm text-muted-foreground">
                    Close this challenge permanently (cannot be undone)
                  </div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 overflow-y-auto pr-4">
              <div className="space-y-4 py-4">
                {selectedNFTs.length > 0 && (
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      {selectedNFTs.length} NFT{selectedNFTs.length > 1 ? "s" : ""} selected
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableInventory.map((nft) => {
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
              </div>
            </ScrollArea>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setShowAddNFTs(false)} disabled={isLoading}>
                Back
              </Button>
              <Button onClick={handleAddNFTs} disabled={selectedNFTs.length === 0 || isLoading}>
                {isLoading ? "Adding..." : `Add ${selectedNFTs.length} NFT${selectedNFTs.length > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
