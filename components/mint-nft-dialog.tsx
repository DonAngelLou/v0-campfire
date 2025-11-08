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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Upload, X } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface MintNftDialogProps {
  children: React.ReactNode
  onMintSuccess: () => void
}

export function MintNftDialog({ children, onMintSuccess }: MintNftDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [nftName, setNftName] = useState("")
  const [nftDescription, setNftDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleMint = async () => {
    if (!user || !imageFile || !nftName || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please provide an image, name, and quantity for your NFT.",
        variant: "destructive",
      })
      return
    }

    const quantityNum = Number.parseInt(quantity)
    if (isNaN(quantityNum) || quantityNum < 1) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity (minimum 1).",
        variant: "destructive",
      })
      return
    }

    setIsMinting(true)

    try {
      // Step 1: Upload image to Vercel Blob
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", imageFile)
      formData.append("organizerWallet", user.wallet_address)

      const uploadResponse = await fetch("/api/upload-nft-image", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || "Failed to upload image")
      }

      const { url: imageUrl } = await uploadResponse.json()
      setIsUploading(false)

      // Step 2: Simulate minting process (blockchain simulation)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Step 3: Add to inventory
      const supabase = createClient()
      const { error: mintError } = await supabase.from("organizer_inventory").insert({
        organizer_wallet: user.wallet_address,
        store_item_id: null,
        is_custom_minted: true,
        custom_name: nftName,
        custom_description: nftDescription || null,
        custom_image_url: imageUrl,
        quantity: quantityNum,
        awarded_count: 0,
        mint_cost: 0, // Will be determined by smart contract in future
      })

      if (mintError) throw mintError

      toast({
        title: "NFT Minted Successfully!",
        description: `${quantityNum} NFT${quantityNum > 1 ? "s" : ""} have been added to your inventory.`,
      })

      // Reset form
      setNftName("")
      setNftDescription("")
      setQuantity("1")
      setImageFile(null)
      setImagePreview(null)
      setOpen(false)

      // Refresh inventory
      onMintSuccess()
    } catch (error) {
      console.error("[v0] Minting error:", error)
      toast({
        title: "Minting Failed",
        description: error instanceof Error ? error.message : "There was an error minting your NFT. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsMinting(false)
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Mint Custom NFT
          </DialogTitle>
          <DialogDescription>
            Create your own custom NFT badge to award as tickets or rewards. This is a simulation preparing for future
            blockchain integration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="nft-image">NFT Image *</Label>
            {!imagePreview ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  id="nft-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label htmlFor="nft-image" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">Click to upload NFT image</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, GIF, or WebP</p>
                </label>
              </div>
            ) : (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border">
                <Image src={imagePreview || "/placeholder.svg"} alt="NFT Preview" fill className="object-cover" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* NFT Name */}
          <div className="space-y-2">
            <Label htmlFor="nft-name">NFT Name *</Label>
            <Input
              id="nft-name"
              placeholder="e.g., Event VIP Pass, Achievement Badge"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* NFT Description */}
          <div className="space-y-2">
            <Label htmlFor="nft-description">Description (Optional)</Label>
            <Textarea
              id="nft-description"
              placeholder="Describe what this NFT represents..."
              value={nftDescription}
              onChange={(e) => setNftDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Mint *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              placeholder="e.g., 100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">How many copies of this NFT do you want to mint?</p>
          </div>

          {/* Info Box */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Minting Simulation</p>
            <p className="text-xs text-muted-foreground">
              This is a simulated minting process. In the future, this will interact with the SUI blockchain smart
              contract to mint actual NFTs. The cost will be determined by the smart contract.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setOpen(false)}
              disabled={isMinting}
            >
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={handleMint} disabled={isMinting || !imageFile || !nftName}>
              {isMinting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isUploading ? "Uploading..." : "Minting..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Mint NFT
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
