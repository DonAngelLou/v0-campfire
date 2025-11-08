"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Trophy, AlertCircle, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCurrentAccount } from "@mysten/dapp-kit"
import {
  buildTransferBadgeTransaction,
  useBlockchainTransaction,
  getExplorerUrl,
} from "@/lib/sui-blockchain"
import { useToast } from "@/hooks/use-toast"
import type { BlockchainToken } from "@/types/blockchain"

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
    sui_wallet_address: string | null
  }
}

interface InventoryItem {
  id: number
  custom_name: string | null
  quantity: number
  awarded_count: number
  transaction_hash: string | null
  blockchain_status: string | null
  blockchain_tokens?: BlockchainToken[] | null
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
  const { toast } = useToast()
  const currentAccount = useCurrentAccount()
  const { executeTransaction } = useBlockchainTransaction()
  const [open, setOpen] = useState(false)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

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
      .lt("awarded_count", supabase.raw("quantity"))

    if (data) setAvailableNFTs(data)
  }

  const handleAward = async () => {
    if (!currentAccount) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your SUI wallet to award badges.",
        variant: "destructive",
      })
      return
    }

    if (!user || !selectedNFT) return

    if (!application.users.sui_wallet_address) {
      toast({
        title: "Recipient Wallet Missing",
        description: "The recipient must have a SUI wallet address to receive NFTs.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setTransactionHash(null)

    try {
      const inventoryItem = availableNFTs.find((item) => item.id === selectedNFT)
      if (!inventoryItem) {
        throw new Error("Unable to locate the selected inventory item.")
      }

      const availableToken = (inventoryItem.blockchain_tokens || []).find((token) => token.status === "available")
      if (!availableToken) {
        throw new Error("No available on-chain badge objects remain in this inventory batch.")
      }

      console.log("[v0] Building transfer transaction...")
      const tx = buildTransferBadgeTransaction({
        badgeObjectId: availableToken.objectId,
        newOwnerAddress: application.users.sui_wallet_address,
        salePrice: 0,
      })

      console.log("[v0] Executing blockchain transaction...")
      const { digest, success } = await executeTransaction(tx)

      if (!success) {
        throw new Error("Blockchain transaction failed")
      }

      setTransactionHash(digest)
      console.log("[v0] Transaction successful:", digest)

      const awardResponse = await fetch("/api/blockchain/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: selectedNFT,
          recipientWallet: application.applicant_wallet,
          awardedBy: user.wallet_address,
          challengeId,
          transactionHash: digest,
          blockchainObjectId: availableToken.objectId,
          notes: "Challenge completion award",
        }),
      })

      if (!awardResponse.ok) {
        const error = await awardResponse.json()
        throw new Error(error.error || "Failed to save award")
      }

      const { remainingQuantity } = await awardResponse.json()

      toast({
        title: "Badge Awarded Successfully!",
        description: `NFT awarded to ${application.users.display_name} on SUI blockchain.`,
      })

      // Wait a moment to show transaction hash
      setTimeout(() => {
        setOpen(false)
        setSelectedNFT(null)
        setTransactionHash(null)

        // Check if inventory is depleted
        if (remainingQuantity === 0) {
          window.dispatchEvent(new CustomEvent("nfts-depleted", { detail: { challengeId } }))
        }

        onSuccess?.()
      }, 3000)
    } catch (error) {
      console.error("[v0] Award error:", error)
      toast({
        title: "Award Failed",
        description: error instanceof Error ? error.message : "Failed to award badge. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
            <DialogDescription>Select an NFT badge from this challenge to award on SUI blockchain</DialogDescription>
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
                  const availableTokens =
                    nft.blockchain_tokens?.filter((token) => token.status === "available").length ??
                    Math.max(nft.quantity - nft.awarded_count, 0)
                  return (
                    <button
                      key={nft.id}
                      type="button"
                      onClick={() => setSelectedNFT(nft.id)}
                      className={`p-2 border-2 rounded-lg transition-all hover:scale-105 ${
                        selectedNFT === nft.id ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={nft.store_items.image_url || "/placeholder.svg"}
                          alt={nft.store_items.name}
                          className="w-full aspect-square object-cover rounded-md mb-1"
                        />
                        {nft.transaction_hash && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                            On-chain
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-medium truncate">{nft.custom_name || nft.store_items.name}</p>
                      <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                        {rank.name}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">{availableTokens} available</p>
                    </button>
                  )
                })}
              </div>

              {transactionHash && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Blockchain Transaction Confirmed
                  </p>
                  <a
                    href={getExplorerUrl(
                      transactionHash,
                      (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") || "testnet",
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-700 dark:text-green-300 hover:underline flex items-center gap-1"
                  >
                    View on Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAward} disabled={!selectedNFT || isLoading}>
                  {isLoading ? "Awarding on Blockchain..." : "Confirm Award"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
