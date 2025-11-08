"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Calendar, Coins, User, ExternalLink, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface StoreItem {
  id: number
  name: string
  description: string
  rank: number
  rank_name: string
  price: number
  image_url: string
  artist_name: string | null
  artist_description: string | null
  is_customizable: boolean
}

interface InventoryItem {
  id: number
  organizer_wallet: string
  store_item_id: number | null
  custom_name: string | null
  custom_description: string | null
  custom_image_url?: string | null
  purchased_at: string
  awarded: boolean
  awarded_to: string | null
  awarded_at: string | null
  challenge_id: number | null
  is_custom_minted?: boolean
  mint_cost?: number | null
  store_items: StoreItem | null
}

const RANK_INFO = {
  5: { name: "Initiate", color: "#A0AEC0", meaning: "The user has begun their journey and proven initial effort." },
  4: { name: "Adept", color: "#4299E1", meaning: "Shows measurable growth and verified participation." },
  3: { name: "Vanguard", color: "#38A169", meaning: "Recognized leader or early adopter in their field/event." },
  2: { name: "Luminary", color: "#D69E2E", meaning: "Proof of exceptional skill, admired by peers." },
  1: {
    name: "Paragon",
    color: "#805AD5",
    meaning: "Ultimate recognition — the gold standard of excellence and proof.",
  },
}

export function NftDetailDialog({
  item,
  onUpdate,
  children,
}: {
  item: InventoryItem
  onUpdate: () => void
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const isCustom = item.is_custom_minted || !item.store_items
  const rank = !isCustom ? item.store_items?.rank : undefined
  const rankInfo = rank ? RANK_INFO[rank as keyof typeof RANK_INFO] : null
  const displayName = item.custom_name || item.store_items?.name || "Custom NFT"
  const displayDescription =
    item.custom_description || item.store_items?.description || "Custom NFT minted by this organization."
  const imageSrc = isCustom ? item.custom_image_url || "/placeholder.svg" : item.store_items?.image_url || "/placeholder.svg"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-2">
            {rank === 1 && <Sparkles className="w-5 h-5 text-yellow-400" />}
            {displayName}
          </DialogTitle>
          <DialogDescription>NFT Badge Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-1">
          <div className="aspect-square relative overflow-hidden rounded-lg bg-muted max-w-md mx-auto">
            <img
              src={imageSrc}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {rankInfo ? (
            <div>
              <Badge style={{ backgroundColor: rankInfo.color, color: "white" }} className="text-sm px-3 py-1">
                Rank {rank} - {rankInfo.name}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">{rankInfo.meaning}</p>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Custom Mint
            </Badge>
          )}

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayDescription}</p>
          </div>

          {!isCustom && item.store_items?.rank === 1 && item.store_items.artist_name && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Artist
              </h3>
              <p className="text-sm font-medium">{item.store_items.artist_name}</p>
              {item.store_items.artist_description && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                  {item.store_items.artist_description}
                </p>
              )}
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Purchased:</span>
              <span>{new Date(item.purchased_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{isCustom ? "Mint Cost:" : "Price:"}</span>
              <span>{isCustom ? item.mint_cost ?? "N/A" : item.store_items?.price} SUI</span>
            </div>
          </div>

          <div className="border-t pt-4 pb-4">
            <h3 className="font-semibold mb-2">Status</h3>
            {item.awarded ? (
              <div className="space-y-2">
                <Badge variant="secondary">Awarded</Badge>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="break-words">Awarded to: {item.awarded_to}</p>
                  {item.awarded_at && <p>Date: {new Date(item.awarded_at).toLocaleDateString()}</p>}
                </div>
                {item.challenge_id && (
                  <Link href={`/challenges/${item.challenge_id}`}>
                    <Button variant="outline" size="sm" className="gap-2 mt-2 bg-transparent">
                      <ExternalLink className="w-4 h-4" />
                      View in Challenge
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Badge variant="default">Available</Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function NFTDetailDialog({
  nft,
  open,
  onOpenChange,
}: {
  nft: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isCustom = nft.is_custom_minted || !nft.store_items
  const rank = !isCustom ? nft.store_items?.rank : undefined
  const rankInfo = rank ? RANK_INFO[rank as keyof typeof RANK_INFO] : null
  const displayName = nft.custom_name || nft.store_items?.name || "Custom NFT"
  const displayDescription =
    nft.custom_description || nft.store_items?.description || "Custom NFT minted by this organization."
  const imageSrc = isCustom ? nft.custom_image_url || "/placeholder.svg" : nft.store_items?.image_url || "/placeholder.svg"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-2">
            {rank === 1 && <Sparkles className="w-5 h-5 text-yellow-400" />}
            {displayName}
          </DialogTitle>
          <DialogDescription>NFT Badge Details</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-1">
          <div className="aspect-square relative overflow-hidden rounded-lg bg-muted max-w-md mx-auto">
            <img
              src={imageSrc}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {rankInfo ? (
            <div>
              <Badge style={{ backgroundColor: rankInfo.color, color: "white" }} className="text-sm px-3 py-1">
                Rank {rank} - {rankInfo.name}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">{rankInfo.meaning}</p>
            </div>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Custom Mint
            </Badge>
          )}

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayDescription}</p>
          </div>

          {!isCustom && nft.store_items?.rank === 1 && nft.store_items.artist_name && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Artist
              </h3>
              <p className="text-sm font-medium">{nft.store_items.artist_name}</p>
              {nft.store_items.artist_description && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                  {nft.store_items.artist_description}
                </p>
              )}
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Purchased:</span>
              <span>{new Date(nft.purchased_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Coins className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{isCustom ? "Mint Cost:" : "Price:"}</span>
              <span>{isCustom ? nft.mint_cost ?? "N/A" : nft.store_items?.price} SUI</span>
            </div>
          </div>

          <div className="border-t pt-4 pb-4">
            <h3 className="font-semibold mb-2">Status</h3>
            {nft.awarded ? (
              <div className="space-y-2">
                <Badge variant="secondary">Awarded</Badge>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="break-words">Awarded to: {nft.awarded_to}</p>
                  {nft.awarded_at && <p>Date: {new Date(nft.awarded_at).toLocaleDateString()}</p>}
                </div>
                {nft.challenge_id && (
                  <Link href={`/challenges/${nft.challenge_id}`}>
                    <Button variant="outline" size="sm" className="gap-2 mt-2 bg-transparent">
                      <ExternalLink className="w-4 h-4" />
                      View in Challenge
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Badge variant="default">Available</Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
