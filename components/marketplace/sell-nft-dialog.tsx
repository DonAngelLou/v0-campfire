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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { UserNftHolding } from "@/types/marketplace"

interface SellNftDialogProps {
  holding: UserNftHolding
  sellerWallet: string
  onSuccess: () => void
  trigger?: React.ReactNode
}

const placeholderImage = "/placeholder.svg?height=400&width=400&text=NFT"

const getHoldingImage = (holding: UserNftHolding) =>
  holding.award?.organizer_inventory?.custom_image_url ||
  holding.award?.organizer_inventory?.store_items?.image_url ||
  placeholderImage

const getHoldingName = (holding: UserNftHolding) =>
  holding.award?.organizer_inventory?.custom_name ||
  holding.award?.organizer_inventory?.store_items?.name ||
  "Custom NFT"

export function SellNftDialog({ holding, sellerWallet, onSuccess, trigger }: SellNftDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState("1")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const parsedPrice = Number(price)
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Enter a price greater than zero (in SUI).",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          holdingId: holding.id,
          sellerWallet,
          price: parsedPrice,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create listing")
      }

      toast({
        title: "NFT Listed",
        description: `${getHoldingName(holding)} is now available for ${parsedPrice} SUI.`,
      })

      setOpen(false)
      setPrice("1")
      onSuccess()
    } catch (error) {
      toast({
        title: "Unable to List NFT",
        description: error instanceof Error ? error.message : "Unexpected error while listing NFT.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Sell NFT
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>List NFT for Sale</DialogTitle>
          <DialogDescription>
            Set a sale price in SUI. Buyers will pay you directly before you complete the transfer on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <img
              src={getHoldingImage(holding)}
              alt={getHoldingName(holding)}
              className="w-24 h-24 rounded-lg object-cover border"
            />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase">NFT</p>
              <p className="font-semibold leading-tight">{getHoldingName(holding)}</p>
              <p className="text-xs text-muted-foreground break-all">{holding.blockchain_object_id}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sale-price">Sale Price (SUI)</Label>
            <Input
              id="sale-price"
              type="number"
              min="0"
              step="0.1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Platform fees and creator royalties are handled automatically by the smart contract when you transfer the
              NFT.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Listing..." : "Confirm Listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
