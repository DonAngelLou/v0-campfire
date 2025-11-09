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
import { useToast } from "@/hooks/use-toast"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { buildTreasuryPaymentTransaction, suiToMist, useBlockchainTransaction } from "@/lib/sui-blockchain"
import type { NftListing } from "@/types/marketplace"

interface PurchaseNftDialogProps {
  listing: NftListing
  buyerWallet: string
  onSuccess: () => void
  children: React.ReactNode
}

export function PurchaseNftDialog({ listing, buyerWallet, onSuccess, children }: PurchaseNftDialogProps) {
  const { toast } = useToast()
  const { currentAccount } = useWalletAuth()
  const { executeTransaction } = useBlockchainTransaction()
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const priceLabel = Number(listing.price_sui).toLocaleString(undefined, { maximumFractionDigits: 4 })

  const image =
    listing.holding?.award?.organizer_inventory?.custom_image_url ||
    listing.holding?.award?.organizer_inventory?.store_items?.image_url ||
    "/placeholder.svg?height=400&width=400"

  const title =
    listing.holding?.award?.organizer_inventory?.custom_name ||
    listing.holding?.award?.organizer_inventory?.store_items?.name ||
    "NFT Badge"

  const handlePurchase = async () => {
    if (!currentAccount) {
      toast({
        title: "Wallet Required",
        description: "Connect your wallet before purchasing.",
        variant: "destructive",
      })
      return
    }

    if (currentAccount.address?.toLowerCase() !== buyerWallet.toLowerCase()) {
      toast({
        title: "Different Wallet Connected",
        description: "Switch to the wallet that is currently viewing this profile before purchasing.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    let reserved = false

    try {
      const reserveResponse = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purchase",
          listingId: listing.id,
          buyerWallet,
        }),
      })

      const reservePayload = await reserveResponse.json()
      if (!reserveResponse.ok) {
        throw new Error(reservePayload.error || "Unable to reserve listing")
      }

      reserved = true

      const paymentTx = buildTreasuryPaymentTransaction(suiToMist(Number(listing.price_sui)), listing.seller_wallet)
      const { digest, success } = await executeTransaction(paymentTx)

      if (!success) {
        throw new Error("Payment transaction failed on SUI")
      }

      const notifyResponse = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment-submitted",
          listingId: listing.id,
          buyerWallet,
          paymentTxHash: digest,
        }),
      })

      const notifyPayload = await notifyResponse.json()
      if (!notifyResponse.ok) {
        throw new Error(notifyPayload.error || "Failed to record payment")
      }

      toast({
        title: "Payment Sent",
        description: "Seller has been notified. They will transfer the NFT once they confirm the funds.",
      })

      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error("[v0] Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "Unable to complete the purchase.",
        variant: "destructive",
      })

      if (reserved) {
        await fetch("/api/marketplace/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "release",
            listingId: listing.id,
            wallet: buyerWallet,
          }),
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isProcessing && setOpen(value)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Purchase NFT</DialogTitle>
          <DialogDescription>
            You will pay <span className="font-semibold">{priceLabel} SUI</span> directly to the seller. After payment,
            the seller must transfer the NFT to you on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <img src={image} alt={title} className="w-24 h-24 rounded-lg object-cover border" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase">Listing</p>
              <p className="font-semibold leading-snug">{title}</p>
              <p className="text-xs text-muted-foreground break-all">{listing.holding?.blockchain_object_id}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 text-sm space-y-2">
            <p className="font-medium text-foreground">
              1. Reserve listing, 2. Approve wallet transfer, 3. Wait for seller to finalize.
            </p>
            <p className="text-muted-foreground">
              Keep the payment transaction hash handy—Campfire stores it automatically once your wallet submits the
              transfer.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={isProcessing}>
            {isProcessing ? "Processing..." : `Pay ${priceLabel} SUI`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
