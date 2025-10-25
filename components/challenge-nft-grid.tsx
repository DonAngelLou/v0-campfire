"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { Package } from "lucide-react"

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}

interface NFTItem {
  id: number
  custom_name: string | null
  awarded_to: string | null
  store_items: {
    name: string
    rank: number
    image_url: string
  }
}

interface ChallengeNFTGridProps {
  challengeId: number
}

export function ChallengeNFTGrid({ challengeId }: ChallengeNFTGridProps) {
  const [nfts, setNfts] = useState<NFTItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNFTs()
  }, [challengeId])

  const fetchNFTs = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("organizer_inventory")
      .select("*, store_items(*)")
      .eq("challenge_id", challengeId)

    setNfts(data || [])
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-2">
        <Package className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">No NFT badges allocated yet</p>
      </div>
    )
  }

  const availableCount = nfts.filter((n) => !n.awarded_to).length
  const awardedCount = nfts.filter((n) => n.awarded_to).length

  return (
    <div className="p-6 bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">NFT Badges</h3>
        <div className="text-sm text-muted-foreground">
          {awardedCount} of {nfts.length} awarded • {availableCount} available
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {nfts.map((nft) => {
          const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
          const isAwarded = !!nft.awarded_to

          return (
            <div
              key={nft.id}
              className={`relative p-2 border-2 rounded-lg transition-all ${
                isAwarded ? "opacity-50 border-border" : "border-primary/50"
              }`}
            >
              <img
                src={nft.store_items.image_url || "/placeholder.svg"}
                alt={nft.store_items.name}
                className="w-full aspect-square object-cover rounded-md mb-1"
              />
              <p className="text-xs font-medium truncate">{nft.custom_name || nft.store_items.name}</p>
              <Badge
                variant="outline"
                className="text-xs mt-1 w-full justify-center"
                style={{ borderColor: rank.color, color: rank.color }}
              >
                {rank.name}
              </Badge>
              {isAwarded && (
                <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
                  <Badge variant="secondary">Awarded</Badge>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
