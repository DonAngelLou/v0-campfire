"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { NftDetailDialog } from "./nft-detail-dialog"
import { MintNftDialog } from "./mint-nft-dialog"
import type { BlockchainToken } from "@/types/blockchain"

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
  purchased_at: string
  awarded: boolean
  awarded_to: string | null
  awarded_at: string | null
  challenge_id: number | null
  is_custom_minted: boolean
  custom_image_url: string | null
  quantity: number
  awarded_count: number
  blockchain_tokens?: BlockchainToken[] | null
  store_items: StoreItem | null
}

const RANK_INFO = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}

interface InventoryDialogProps {
  children: React.ReactNode
  organizerWallet?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function getAvailableTokenCount(item: InventoryItem) {
  if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
    return item.blockchain_tokens.filter((token) => token.status === "available").length
  }
  return Math.max((item.quantity || 0) - (item.awarded_count || 0), 0)
}

function getAwardedTokenCount(item: InventoryItem) {
  if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
    return item.blockchain_tokens.filter((token) => token.status === "awarded").length
  }
  return item.awarded_count || 0
}

export function InventoryDialog({ children, organizerWallet, open, onOpenChange }: InventoryDialogProps) {
  const { user, currentAccount } = useWalletAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedRank, setSelectedRank] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  const resolvedWallet =
    organizerWallet || user?.sui_wallet_address || user?.wallet_address || currentAccount?.address || null

  const dialogOpen = open ?? internalOpen

  useEffect(() => {
    if (!dialogOpen || !resolvedWallet) {
      return
    }
    fetchInventory(resolvedWallet)
  }, [dialogOpen, resolvedWallet])

  const fetchInventory = async (wallet: string) => {
    setIsLoading(true)
    try {
      if (organizerWallet) {
        const response = await fetch(`/api/organizations/${wallet}/inventory`)
        if (!response.ok) {
          throw new Error("Failed to load inventory.")
        }
        const data = await response.json()
        setInventory(data as InventoryItem[])
      } else {
        const supabase = createClient()
        const { data } = await supabase
          .from("organizer_inventory")
          .select(
            `
            *,
            store_items(*)
          `,
          )
          .eq("organizer_wallet", wallet)
          .order("purchased_at", { ascending: false })

        if (data) {
          setInventory(data as InventoryItem[])
        }
      }
    } catch (error) {
      console.error("[v0] Inventory fetch error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterByRank = (items: InventoryItem[]) => {
    if (selectedRank === "all") return items
    return items.filter((item) => !item.is_custom_minted && item.store_items?.rank === Number.parseInt(selectedRank))
  }

  const availableItems = filterByRank(inventory.filter((item) => getAvailableTokenCount(item) > 0))

  const awardedItems = filterByRank(
    inventory.filter((item) => getAvailableTokenCount(item) === 0 && getAwardedTokenCount(item) > 0),
  )

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(value) => {
        if (onOpenChange) {
          onOpenChange(value)
        } else {
          setInternalOpen(value)
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            NFT Inventory
          </DialogTitle>
          <DialogDescription>View and manage your purchased and minted NFT badges</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by rank:</span>
              <Select value={selectedRank} onValueChange={setSelectedRank}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Ranks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranks</SelectItem>
                  <SelectItem value="5">Initiate</SelectItem>
                  <SelectItem value="4">Adept</SelectItem>
                  <SelectItem value="3">Vanguard</SelectItem>
                  <SelectItem value="2">Luminary</SelectItem>
                  <SelectItem value="1">Paragon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <MintNftDialog
              organizerWallet={resolvedWallet || undefined}
              onMintSuccess={() => {
                if (resolvedWallet) {
                  fetchInventory(resolvedWallet)
                }
              }}
            >
              <Button className="gap-2">
                <Sparkles className="w-4 h-4" />
                Mint Custom NFT
              </Button>
            </MintNftDialog>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="available" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available ({availableItems.length})</TabsTrigger>
              <TabsTrigger value="awarded">Awarded ({awardedItems.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="available" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : availableItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {availableItems.map((item) => (
                    <NftCard key={item.id} item={item} onUpdate={fetchInventory} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No available NFTs in inventory</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Visit the store to purchase NFT badges or mint your own custom NFTs
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="awarded" className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : awardedItems.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {awardedItems.map((item) => (
                    <NftCard key={item.id} item={item} onUpdate={fetchInventory} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No awarded NFTs yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NftCard({ item, onUpdate }: { item: InventoryItem; onUpdate: () => void }) {
  const isCustom = item.is_custom_minted
  const displayName = item.custom_name || item.store_items?.name || "Custom NFT"
  const displayImage = isCustom ? item.custom_image_url : item.store_items?.image_url
  const rankInfo = !isCustom && item.store_items ? RANK_INFO[item.store_items.rank as keyof typeof RANK_INFO] : null

  return (
    <NftDetailDialog item={item} onUpdate={onUpdate}>
      <div className="group cursor-pointer border rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={displayImage || "/placeholder.svg"}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {isCustom && (
            <div className="absolute top-2 right-2">
              <Badge className="gap-1 bg-primary text-xs">
                <Sparkles className="w-3 h-3" />
                Custom
              </Badge>
            </div>
          )}
          {!isCustom && item.store_items?.rank === 1 && (
            <div className="absolute top-2 right-2">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            </div>
          )}
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-semibold text-sm line-clamp-1">{displayName}</h3>
          <div className="flex items-center justify-between gap-2">
            {rankInfo ? (
              <Badge style={{ backgroundColor: rankInfo.color, color: "white" }} className="text-xs">
                {rankInfo.name}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Qty: {getAvailableTokenCount(item)}/{item.quantity || getAvailableTokenCount(item)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </NftDetailDialog>
  )
}
