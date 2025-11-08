"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingCart, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import Image from "next/image"

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

export default function StorePage() {
  return (
    <ProtectedRoute>
      <StoreContent />
    </ProtectedRoute>
  )
}

function StoreContent() {
  const { user, isLoading: authLoading } = useWalletAuth()
  const router = useRouter()
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRank, setSelectedRank] = useState<string>("all")
  const [isOrgMember, setIsOrgMember] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      console.log("[v0] Store page - checking organization membership for user:", user.wallet_address)
      checkOrgMembership()
      fetchStoreItems()
    }
  }, [user, authLoading])

  const checkOrgMembership = async () => {
    const supabase = createClient()
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_wallet", user?.wallet_address)

    console.log("[v0] Store page - organization memberships:", memberships)

    if (!memberships || memberships.length === 0) {
      console.log("[v0] Store page - user is not a member of any organization, redirecting")
      router.push(`/profile/${user?.wallet_address}`)
      return
    }

    setIsOrgMember(true)
  }

  const fetchStoreItems = async () => {
    console.log("[v0] Store page - fetching store items")
    const supabase = createClient()
    const { data } = await supabase.from("store_items").select("*").order("rank", { ascending: true })

    console.log("[v0] Store page - fetched items:", data?.length || 0)
    setStoreItems(data || [])
    setIsLoading(false)
  }

  if (authLoading || isLoading) {
    console.log("[v0] Store page - loading state")
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user || !isOrgMember) {
    console.log("[v0] Store page - no user or not org member, returning null")
    return null
  }

  console.log("[v0] Store page - rendering store content")

  const filteredItems =
    selectedRank === "all" ? storeItems : storeItems.filter((item) => item.rank.toString() === selectedRank)

  const rankInfo = {
    "5": { name: "Initiate", color: "#A0AEC0", description: "The beginning of the journey" },
    "4": { name: "Adept", color: "#4299E1", description: "Shows measurable growth and verified participation" },
    "3": { name: "Vanguard", color: "#38A169", description: "Recognized leader or early adopter" },
    "2": { name: "Luminary", color: "#D69E2E", description: "Proof of exceptional skill, admired by peers" },
    "1": { name: "Paragon", color: "#805AD5", description: "Ultimate recognition — the gold standard of excellence" },
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">NFT Badge Store</h1>
          </div>
          <p className="text-muted-foreground">
            Purchase NFT badges to award to your challenge participants. Each rank represents a different level of
            achievement.
          </p>
        </div>

        <Tabs value={selectedRank} onValueChange={setSelectedRank} className="mb-8">
          <TabsList className="grid w-full grid-cols-6 h-auto p-2 gap-2 bg-muted/50">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              All Ranks
            </TabsTrigger>
            <TabsTrigger
              value="5"
              className="data-[state=active]:bg-[#A0AEC0] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#A0AEC0]/50 transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-[#A0AEC0]/30"
              style={
                {
                  "--rank-color": "#A0AEC0",
                } as React.CSSProperties
              }
            >
              Initiate
            </TabsTrigger>
            <TabsTrigger
              value="4"
              className="data-[state=active]:bg-[#4299E1] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#4299E1]/50 transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-[#4299E1]/30"
            >
              Adept
            </TabsTrigger>
            <TabsTrigger
              value="3"
              className="data-[state=active]:bg-[#38A169] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#38A169]/50 transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-[#38A169]/30"
            >
              Vanguard
            </TabsTrigger>
            <TabsTrigger
              value="2"
              className="data-[state=active]:bg-[#D69E2E] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#D69E2E]/50 transition-all duration-300 hover:scale-105 hover:shadow-md hover:shadow-[#D69E2E]/30"
            >
              Luminary
            </TabsTrigger>
            <TabsTrigger
              value="1"
              className="data-[state=active]:bg-[#805AD5] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#805AD5]/50 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#805AD5]/40 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-1">
                Paragon
                <Sparkles className="w-3 h-3" />
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedRank !== "all" && (
          <Card
            className="mb-8 animate-slide-up"
            style={{ borderColor: rankInfo[selectedRank as keyof typeof rankInfo].color }}
          >
            <CardHeader>
              <CardTitle style={{ color: rankInfo[selectedRank as keyof typeof rankInfo].color }}>
                {rankInfo[selectedRank as keyof typeof rankInfo].name}
              </CardTitle>
              <CardDescription>{rankInfo[selectedRank as keyof typeof rankInfo].description}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => (
            <Card
              key={item.id}
              className="group transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => router.push(`/store/${item.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  {item.rank === 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="gap-1 bg-purple-600">
                        <Sparkles className="w-3 h-3" />
                        Exclusive
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: item.rank_color, color: "white" }}>{item.rank_name}</Badge>
                  {item.is_customizable && <Badge variant="outline">Customizable</Badge>}
                </div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription className="line-clamp-2">{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{item.price} SUI</span>
                  <Button
                    size="sm"
                    className="gap-2 transition-all duration-200 hover:scale-105"
                    onClick={(event) => {
                      event.stopPropagation()
                      router.push(`/store/${item.id}`)
                    }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    View
                  </Button>
                </div>
                {item.artist_name && <p className="text-xs text-muted-foreground mt-2">Artist: {item.artist_name}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card className="animate-fade-in">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No items found in this category.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
