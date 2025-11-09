"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useToast } from "@/hooks/use-toast"
import { buildTransferBadgeTransaction, suiToMist, useBlockchainTransaction } from "@/lib/sui-blockchain"
import type { NftListing } from "@/types/marketplace"

interface CompleteSaleDialogProps {
  listing: NftListing
  sellerWallet: string
  onSuccess: () => void
  children: React.ReactNode
}

export function CompleteSaleDialog({ listing, sellerWallet, onSuccess, children }: CompleteSaleDialogProps) {
  const { toast } = useToast()
  const { currentAccount } = useWalletAuth()
  const { executeTransaction } = useBlockchainTransaction()
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const buyerAddress = listing.buyer_wallet || "Unknown buyer"
  const priceLabel = Number(listing.price_sui).toLocaleString(undefined, { maximumFractionDigits: 4 })
  const nftName =
    listing.holding?.award?.organizer_inventory?.custom_name ||
    listing.holding?.award?.organizer_inventory?.store_items?.name ||
    "NFT Badge"

  const handleComplete = async () => {
    if (!listing.holding?.blockchain_object_id || !listing.buyer_wallet) {
      toast({
        title: "Missing NFT data",
        description: "Unable to locate the NFT object or buyer wallet.",
        variant: "destructive",
      })
      return
    }

    if (!currentAccount) {
      toast({
        title: "Wallet Required",
        description: "Connect the seller wallet to transfer the NFT.",
        variant: "destructive",
      })
      return
    }

    if (currentAccount.address?.toLowerCase() !== sellerWallet.toLowerCase()) {
      toast({
        title: "Wrong Wallet",
        description: "Switch to the wallet that owns this NFT before completing the sale.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const transferTx = buildTransferBadgeTransaction({
        badgeObjectId: listing.holding.blockchain_object_id,
        newOwnerAddress: listing.buyer_wallet,
        salePrice: suiToMist(Number(listing.price_sui)),
      })

      const { digest, success } = await executeTransaction(transferTx)
      if (!success) {
        throw new Error("Transfer transaction failed on SUI")
      }

      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          listingId: listing.id,
          sellerWallet,
          transferTxHash: digest,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to record transfer")
      }

      toast({
        title: "Sale Completed",
        description: "Ownership has been transferred to the buyer.",
      })

      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error("[v0] Complete sale error:", error)
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Unable to complete the sale.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isProcessing && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete NFT Transfer</DialogTitle>
          <DialogDescription>
            Send <span className="font-semibold">{nftName}</span> to {buyerAddress}. This will also distribute creator
            royalties and platform fees from the sale price ({priceLabel} SUI).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p>Make sure you already received the buyer&apos;s payment before completing this step.</p>
          <p className="text-muted-foreground">
            Once the transfer transaction confirms on-chain, Campfire will mark this listing as completed and move the
            NFT to the buyer&apos;s inventory.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isProcessing}>
            {isProcessing ? "Transferring..." : "Transfer NFT"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
