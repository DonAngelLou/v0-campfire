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
import { Sparkles, Upload, X, ExternalLink } from "lucide-react"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import {
  buildMintPaidTransaction,
  useBlockchainTransaction,
  validateBlockchainConfig,
  getExplorerUrl,
  isCampfireBadgeObject,
  SUI_DECIMALS,
} from "@/lib/sui-blockchain"

interface MintNftDialogProps {
  children: React.ReactNode
  onMintSuccess: () => void
  organizerWallet?: string
}

const ENV_PRICE_MIST = Number(process.env.NEXT_PUBLIC_MINT_PRICE_MIST ?? "0")
const ENV_PRICE_SUI = Number(process.env.NEXT_PUBLIC_MINT_PRICE_SUI ?? "0")
const FALLBACK_PRICE_SUI = 0.7
const DEFAULT_MINT_PRICE_MIST =
  ENV_PRICE_MIST > 0
    ? ENV_PRICE_MIST
    : Math.round(((ENV_PRICE_SUI > 0 ? ENV_PRICE_SUI : FALLBACK_PRICE_SUI) || FALLBACK_PRICE_SUI) * SUI_DECIMALS)
const formatMistToSui = (mist: number) =>
  (mist / SUI_DECIMALS).toLocaleString(undefined, { maximumFractionDigits: 4 })
const DEFAULT_RANK_LABEL = "Custom"

const MAX_IMAGE_SIZE_MB = 5

export function MintNftDialog({ children, onMintSuccess, organizerWallet }: MintNftDialogProps) {
  const { user, currentAccount } = useWalletAuth()
  const { toast } = useToast()
  const { executeTransaction } = useBlockchainTransaction()
  const [open, setOpen] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  // Form state
  const [nftName, setNftName] = useState("")
  const [nftDescription, setNftDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const parsedQuantity = Number.parseInt(quantity)
  const quantityNumber = Number.isNaN(parsedQuantity) ? 0 : parsedQuantity
  const displayQuantity = Math.max(quantityNumber || 1, 1)
  const estimatedTotalCostMist = DEFAULT_MINT_PRICE_MIST * displayQuantity

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast({
          title: "Image Too Large",
          description: `Please pick an image smaller than ${MAX_IMAGE_SIZE_MB}MB.`,
          variant: "destructive",
        })
        e.target.value = ""
        return
      }
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
    const activeWallet =
      organizerWallet || user?.wallet_address || user?.sui_wallet_address || currentAccount?.address

    if (!currentAccount) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your SUI wallet to mint NFTs.",
        variant: "destructive",
      })
      return
    }

    if (!activeWallet) {
      toast({
        title: "No Organizer Wallet",
        description: "Select an organization before minting NFTs.",
        variant: "destructive",
      })
      return
    }

    if (!imageFile || !nftName || !quantity) {
      toast({
        title: "Missing Information",
        description: "Please provide an image, name, and quantity for your NFT.",
        variant: "destructive",
      })
      return
    }

    const configValidation = validateBlockchainConfig()
    if (!configValidation.valid) {
      toast({
        title: "Configuration Error",
        description: configValidation.error || "Blockchain configuration is incomplete.",
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
    setTransactionHash(null)

    try {
      // Step 1: Upload image to Vercel Blob
      setIsUploading(true)
      const formData = new FormData()
      formData.append("file", imageFile)
      formData.append("organizerWallet", activeWallet)

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

      console.log("[v0] Building mint transaction...")
      const issuerAddress = currentAccount.address
      const tx = buildMintPaidTransaction({
        name: nftName,
        description: nftDescription || `Custom NFT: ${nftName}`,
        imageUrl,
        metadataUri: imageUrl,
        rank: DEFAULT_RANK_LABEL,
        quantity: quantityNum,
        recipientAddress: currentAccount.address,
        issuerAddress,
        expectedPrice: DEFAULT_MINT_PRICE_MIST,
      })

      console.log("[v0] Executing blockchain transaction...")
      const { digest, success, objectChanges } = await executeTransaction(tx)

      if (!success) {
        throw new Error("Blockchain transaction failed")
      }

      const mintedObjects = objectChanges.filter(isCampfireBadgeObject)
      if (mintedObjects.length < quantityNum) {
        throw new Error("Unable to confirm minted NFT object ids from blockchain response.")
      }

      const mintedTokens = mintedObjects.slice(0, quantityNum).map((obj) => ({
        objectId: obj.objectId,
        mintedTransactionHash: digest,
      }))

      setTransactionHash(digest)
      console.log("[v0] Transaction successful:", digest)

      const mintCostSui = (DEFAULT_MINT_PRICE_MIST / SUI_DECIMALS) * quantityNum

      const saveResponse = await fetch("/api/blockchain/mint-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerWallet: activeWallet,
          transactionHash: digest,
          nftName,
          nftDescription: nftDescription || null,
          imageUrl,
          quantity: quantityNum,
          mintCost: mintCostSui,
          mintedTokens,
        }),
      })

      if (!saveResponse.ok) {
        const error = await saveResponse.json()
        throw new Error(error.error || "Failed to save to database")
      }

      toast({
        title: "NFT Minted Successfully!",
        description: `${quantityNum} NFT${quantityNum > 1 ? "s" : ""} minted on SUI blockchain.`,
      })

      // Reset form
      setNftName("")
      setNftDescription("")
      setQuantity("1")
      setImageFile(null)
      setImagePreview(null)

      // Wait a moment to show transaction hash before closing
      setTimeout(() => {
        setOpen(false)
        setTransactionHash(null)
        onMintSuccess()
      }, 3000)
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
            Mint Custom NFT on SUI
          </DialogTitle>
          <DialogDescription>
            Create your own custom NFT badge on the SUI blockchain to award as tickets or rewards.
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

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">SUI Blockchain Minting</p>
            <p className="text-xs text-muted-foreground">
              This will create a real NFT on the SUI blockchain. You'll need to approve the transaction in your wallet.
              Gas fees will apply.
            </p>
            {DEFAULT_MINT_PRICE_MIST > 0 && (
              <p className="text-xs text-muted-foreground">
                Estimated cost: {formatMistToSui(estimatedTotalCostMist)} SUI ({displayQuantity} x{" "}
                {formatMistToSui(DEFAULT_MINT_PRICE_MIST)} SUI)
              </p>
            )}
          </div>

          {transactionHash && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Blockchain Transaction Confirmed</p>
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
                  {isUploading ? "Uploading..." : "Minting on Blockchain..."}
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
