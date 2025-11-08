"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ShoppingCart, Sparkles, User } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { useCurrentAccount } from "@mysten/dapp-kit"
import {
  buildMintPaidTransaction,
  isCampfireBadgeObject,
  SUI_DECIMALS,
  useBlockchainTransaction,
} from "@/lib/sui-blockchain"

const ACTIVE_ORG_STORAGE_KEY = "campfire_active_org"

interface StoreItem {
  id: string
  name: string
  description: string
  rank: number
  rank_name: string
  rank_color: string
  price: number
  image_url: string
  is_customizable: boolean
  artist_name: string | null
  artist_description: string | null
}

export default function StoreItemPage() {
  return (
    <ProtectedRoute>
      <StoreItemContent />
    </ProtectedRoute>
  )
}

function StoreItemContent() {
  const { user, isLoading: authLoading } = useWalletAuth()
  const currentAccount = useCurrentAccount()
  const { executeTransaction } = useBlockchainTransaction()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [item, setItem] = useState<StoreItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customDescription, setCustomDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [membershipChecked, setMembershipChecked] = useState(false)
  const [organizations, setOrganizations] = useState<{ wallet: string; name: string }[]>([])
  const [organizationWallet, setOrganizationWallet] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState("")

  useEffect(() => {
    if (authLoading || !user) return

    const loadOrganizations = async () => {
      const supabase = createClient()
      const accessibleWallets = new Set<string>()
      const walletNames: Record<string, string> = {}

      const { data: ownedOrg } = await supabase
        .from("organizers")
        .select("wallet_address, org_name")
        .eq("wallet_address", user.wallet_address)
        .maybeSingle()

      if (ownedOrg?.wallet_address) {
        accessibleWallets.add(ownedOrg.wallet_address)
        walletNames[ownedOrg.wallet_address] = ownedOrg.org_name || ownedOrg.wallet_address
      }

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_wallet")
        .eq("user_wallet", user.wallet_address)
        .eq("status", "active")

      memberships?.forEach((row) => accessibleWallets.add(row.organization_wallet))

      const wallets = Array.from(accessibleWallets)

      if (wallets.length === 0) {
        setMembershipChecked(true)
        toast({
          title: "Organizer Access Required",
          description: "Only organization members can purchase store badges.",
          variant: "destructive",
        })
        router.push(`/profile/${user.wallet_address}`)
        return
      }

      const { data: orgDetails } = await supabase
        .from("organizers")
        .select("wallet_address, org_name")
        .in("wallet_address", wallets)

      orgDetails?.forEach((org) => {
        walletNames[org.wallet_address] = org.org_name || org.wallet_address
      })

      wallets.forEach((wallet) => {
        if (!walletNames[wallet]) {
          walletNames[wallet] = wallet
        }
      })

      const orgList = wallets.map((wallet) => ({
        wallet,
        name: walletNames[wallet] || wallet,
      }))
      setOrganizations(orgList)

      const storedOrg =
        typeof window !== "undefined" ? window.localStorage.getItem(ACTIVE_ORG_STORAGE_KEY) : null
      const preferredWallet =
        storedOrg && walletNames[storedOrg] ? storedOrg : wallets[0]

      setOrganizationWallet(preferredWallet)
      setOrganizationName(walletNames[preferredWallet] || preferredWallet)
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, preferredWallet)
      }

      setMembershipChecked(true)

      setMembershipChecked(true)
    }

    loadOrganizations()
  }, [user, authLoading, router, toast])

  useEffect(() => {
    if (!authLoading && membershipChecked && organizationWallet) {
      fetchStoreItem()
    }
  }, [authLoading, membershipChecked, organizationWallet, params.id])

  const fetchStoreItem = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("store_items").select("*").eq("id", params.id).single()

    setItem(data)
    setIsLoading(false)
  }

  const handlePurchase = async () => {
    if (!user || !item || !organizationWallet) return

    if (!currentAccount) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Slush wallet to complete the purchase.",
        variant: "destructive",
      })
      return
    }

    const quantityNumber = isParagon ? 1 : Math.max(1, Math.min(50, Number.parseInt(quantity, 10) || 0))

    if (!isParagon && (!Number.isInteger(quantityNumber) || quantityNumber < 1)) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity between 1 and 50.",
        variant: "destructive",
      })
      return
    }

    if (item.is_customizable && (!customName.trim() || !customDescription.trim())) {
      toast({
        title: "Missing Information",
        description: "Please provide a custom name and description for this badge.",
        variant: "destructive",
      })
      return
    }

    setIsPurchasing(true)

    try {
      const issuerLabel = organizationName || user.display_name || user.wallet_address
      const metadataPayload = {
        name: item.is_customizable && customName ? customName : item.name,
        description: item.is_customizable && customDescription ? customDescription : item.description,
        image: item.image_url,
        attributes: [
          { trait_type: "Rank", value: item.rank_name },
          { trait_type: "Issuer", value: issuerLabel },
        ],
      }

      const metadataResponse = await fetch("/api/blockchain/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: metadataPayload,
          organizerWallet: organizationWallet,
          storeItemId: item.id,
        }),
      })

      const metadataJson = await metadataResponse.json().catch(() => null)
      if (!metadataResponse.ok || !metadataJson?.url) {
        throw new Error(metadataJson?.error || "Failed to prepare metadata for minting.")
      }

      const { url: metadataUrl } = metadataJson
      const priceMist = Math.round(Number(item.price) * SUI_DECIMALS)

      if (priceMist <= 0) {
        throw new Error("Invalid price configured for this badge.")
      }

        const tx = buildMintPaidTransaction({
          name: metadataPayload.name,
          description: metadataPayload.description,
          imageUrl: item.image_url,
          metadataUri: metadataUrl,
          rank: item.rank_name,
          quantity: quantityNumber,
          recipientAddress: currentAccount.address,
          issuerAddress: currentAccount.address,
          expectedPrice: priceMist,
        })

      const { digest, success, objectChanges } = await executeTransaction(tx)

      if (!success) {
        throw new Error("Blockchain transaction failed.")
      }

      const mintedObjects = objectChanges.filter(isCampfireBadgeObject)
      if (mintedObjects.length < quantityNumber) {
        throw new Error("Unable to confirm all minted badges on-chain.")
      }

      const mintedTokens = mintedObjects.slice(0, quantityNumber).map((obj) => ({
        objectId: obj.objectId,
        status: "available",
        mintedTransactionHash: digest,
        mintedAt: new Date().toISOString(),
      }))

      const purchaseResponse = await fetch("/api/blockchain/store-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizerWallet: organizationWallet,
          storeItemId: item.id,
          quantity: quantityNumber,
          pricePaid: item.price * quantityNumber,
          transactionHash: digest,
          mintedTokens,
          customName: item.is_customizable ? customName : null,
          customDescription: item.is_customizable ? customDescription : null,
        }),
      })

      if (!purchaseResponse.ok) {
        const error = await purchaseResponse.json().catch(() => null)
        throw new Error(error?.error || "Failed to save purchase.")
      }

      toast({
        title: "Purchase Successful!",
        description: "The NFT badge has been minted and added to your organization inventory.",
      })

      router.push("/dashboard?tab=inventory")
      setQuantity("1")
      setCustomName("")
      setCustomDescription("")
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: error instanceof Error ? error.message : "There was an error processing your purchase.",
        variant: "destructive",
      })
    } finally {
      setIsPurchasing(false)
    }
  }

  if (authLoading || !membershipChecked || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user || !organizationWallet) {
    return null
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Item not found.</p>
              <Link href="/store">
                <Button className="mt-4">Back to Store</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isParagon = item.rank === 1
  const displayQuantity = isParagon ? 1 : Math.max(1, Math.min(50, Number.parseInt(quantity, 10) || 1))
  const totalPrice = Number(item.price) * displayQuantity

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <Link href="/store">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Button>
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div className="animate-fade-in">
            <Card>
              <CardContent className="p-6">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                  <Image src={item.image_url || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                  {item.rank === 1 && (
                    <div className="absolute top-4 right-4">
                      <Badge className="gap-1 bg-purple-600 text-lg px-3 py-1">
                        <Sparkles className="w-4 h-4" />
                        Exclusive Artwork
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge style={{ backgroundColor: item.rank_color, color: "white" }} className="text-sm">
                    Rank {item.rank} - {item.rank_name}
                  </Badge>
                  {item.is_customizable && (
                    <Badge variant="outline" className="text-sm">
                      Customizable
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Details Section */}
          <div className="animate-slide-up animation-delay-100">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">{item.name}</CardTitle>
                <CardDescription className="text-base">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {organizations.length > 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="organization-select">Organization</Label>
                      <Select
                        value={organizationWallet ?? undefined}
                        onValueChange={(value) => {
                          setOrganizationWallet(value)
                          const org = organizations.find((o) => o.wallet === value)
                          setOrganizationName(org?.name || value)
                          if (typeof window !== "undefined") {
                            window.localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, value)
                          }
                        }}
                      >
                        <SelectTrigger id="organization-select">
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.wallet} value={org.wallet}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Purchasing as: <span className="font-medium">{organizationName || organizationWallet}</span>
                    </p>
                    <span className="text-4xl font-bold text-primary">{totalPrice} SUI</span>
                    {!isParagon && (
                      <p className="text-sm text-muted-foreground">
                        {displayQuantity} × {item.price} SUI each
                      </p>
                    )}
                  </div>
                </div>

                {item.artist_name && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Artist Information
                    </h3>
                    <p className="text-sm font-medium text-foreground">{item.artist_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.artist_description}</p>
                  </div>
                )}

                  {item.is_customizable && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                      <h3 className="font-semibold mb-3">Customize Your Badge</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add a custom name and description to personalize this badge for your challenge.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-name">Badge Name *</Label>
                      <Input
                        id="custom-name"
                        placeholder="e.g., Web3 Pioneer Award"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-description">Badge Description *</Label>
                      <Textarea
                        id="custom-description"
                        placeholder="Describe what this badge represents..."
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                    </div>
                  </div>
                )}

                  {!item.is_customizable && (
                    <div className="border-t pt-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> This is an exclusive Paragon artwork. The name and description are set by
                          the artist and cannot be customized.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    <Label htmlFor="quantity">
                      Quantity {isParagon ? "(Paragon badges limited to one mint)" : "(Max 50 per purchase)"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={50}
                      step={1}
                      value={isParagon ? "1" : quantity}
                      disabled={isParagon}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    {isParagon && (
                      <p className="text-xs text-muted-foreground">Paragon NFTs are strictly one-of-a-kind.</p>
                    )}
                  </div>

                  <Button size="lg" className="w-full gap-2 text-lg" onClick={handlePurchase} disabled={isPurchasing}>
                    {isPurchasing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Purchase for {totalPrice} SUI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
        </div>
      </div>
    </div>
  )
}
