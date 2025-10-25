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
import { ArrowLeft, ShoppingCart, Sparkles, User } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

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
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [item, setItem] = useState<StoreItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customDescription, setCustomDescription] = useState("")

  useEffect(() => {
    if (user) {
      if (user.role !== "organizer") {
        router.push(`/profile/${user.wallet_address}`)
        return
      }
      fetchStoreItem()
    }
  }, [user, params.id])

  const fetchStoreItem = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("store_items").select("*").eq("id", params.id).single()

    setItem(data)
    setIsLoading(false)
  }

  const handlePurchase = async () => {
    if (!user || !item) return

    if (item.is_customizable && (!customName || !customDescription)) {
      toast({
        title: "Missing Information",
        description: "Please provide a custom name and description for this badge.",
        variant: "destructive",
      })
      return
    }

    setIsPurchasing(true)

    try {
      const supabase = createClient()

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Add to inventory
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("organizer_inventory")
        .insert({
          organizer_wallet: user.wallet_address,
          store_item_id: item.id,
          custom_name: item.is_customizable ? customName : null,
          custom_description: item.is_customizable ? customDescription : null,
        })
        .select()
        .single()

      if (inventoryError) throw inventoryError

      // Add to purchase history
      await supabase.from("purchase_history").insert({
        organizer_wallet: user.wallet_address,
        store_item_id: item.id,
        inventory_id: inventoryItem.id,
        price_paid: item.price,
      })

      toast({
        title: "Purchase Successful!",
        description: "The NFT badge has been added to your inventory.",
      })

      router.push("/dashboard?tab=inventory")
    } catch (error) {
      console.error("Purchase error:", error)
      toast({
        title: "Purchase Failed",
        description: "There was an error processing your purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
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
                <div>
                  <span className="text-4xl font-bold text-primary">${item.price}</span>
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

                <Button size="lg" className="w-full gap-2 text-lg" onClick={handlePurchase} disabled={isPurchasing}>
                  {isPurchasing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Purchase for ${item.price}
                    </>
                  )}
                </Button>

                <div className="text-xs text-muted-foreground text-center">
                  <p>Simulated payment - No real transaction will occur</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
