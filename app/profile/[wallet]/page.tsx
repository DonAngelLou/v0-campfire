"use client"

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AwardIcon, HeartIcon, BuildingIcon, UserPlusIcon, ExternalLinkIcon, QrCode } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { TagInfluencerDialog } from "@/components/tag-influencer-dialog"
import { PendingInfluences } from "@/components/pending-influences"
import { generateUserId } from "@/lib/utils"
import { EditProfileInline } from "@/components/edit-profile-inline"
import { SelectOrganizationDialog } from "@/components/select-organization-dialog"
import { ShowQRCodeDialog } from "@/components/show-qr-code-dialog"
import { useToast } from "@/hooks/use-toast"
import { SellNftDialog } from "@/components/marketplace/sell-nft-dialog"
import { PurchaseNftDialog } from "@/components/marketplace/purchase-nft-dialog"
import { CompleteSaleDialog } from "@/components/marketplace/complete-sale-dialog"
import type { ListingStatus, NftListing, UserNftHolding } from "@/types/marketplace"

interface User {
  wallet_address: string
  sui_wallet_address: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  role: "user" | "organizer"
  created_at: string
}

interface AwardData {
  id: number
  awarded_at: string
  notes: string | null
  awarded_by: string
  challenge_id: number
  challenges: {
    id: number
    name: string
    description: string
  }
  organizers: {
    org_name: string
    wallet_address: string
  }
  organizer_inventory: {
    id: number
    store_items: {
      id: number
      name: string
      description: string
      rank: number
      image_url: string
      artist_name: string | null
    }
  }
  is_sold?: boolean
  sold_at?: string | null
  sold_to_wallet?: string | null
}

interface Influence {
  influencer: User
  influenced: User
  award_id: number | null
  status: "pending" | "approved" | "rejected"
}

const MARKETPLACE_ACTIVE_STATUSES: ListingStatus[] = ["active", "payment_pending", "awaiting_transfer"]
const LISTING_STATUS_COPY: Record<ListingStatus, string> = {
  active: "Active",
  payment_pending: "Awaiting Buyer Payment",
  awaiting_transfer: "Awaiting Transfer",
  completed: "Completed",
  cancelled: "Cancelled",
}
const LISTING_STATUS_STYLES: Record<ListingStatus, string> = {
  active: "bg-blue-100 text-blue-800",
  payment_pending: "bg-amber-100 text-amber-800",
  awaiting_transfer: "bg-purple-100 text-purple-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const params = useParams()
  const wallet = params?.wallet as string
  const { user: currentUser } = useWalletAuth()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [awards, setAwards] = useState<AwardData[]>([])
  const [influencers, setInfluencers] = useState<Influence[]>([])
  const [influenced, setInfluenced] = useState<Influence[]>([])
  const [likes, setLikes] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tagInfluencerOpen, setTagInfluencerOpen] = useState(false)
  const [tagBadgeInfluencerOpen, setTagBadgeInfluencerOpen] = useState(false)
  const [selectedAwardForInfluencer, setSelectedAwardForInfluencer] = useState<{
    id: number
    name: string
  } | null>(null)
  const [selectOrgOpen, setSelectOrgOpen] = useState(false)
  const [qrCodeOpen, setQrCodeOpen] = useState(false)
  const [holdings, setHoldings] = useState<UserNftHolding[]>([])
  const [listings, setListings] = useState<NftListing[]>([])
  const [isMarketplaceLoading, setIsMarketplaceLoading] = useState(true)

  const profileWalletAddress = user?.sui_wallet_address || user?.wallet_address
  const viewerWalletAddress = currentUser?.sui_wallet_address || currentUser?.wallet_address || ""
  const normalizedProfileWallet = profileWalletAddress?.toLowerCase() ?? ""
  const normalizedViewerWallet = viewerWalletAddress.toLowerCase()
  const isOwnProfile = !!normalizedProfileWallet && normalizedProfileWallet === normalizedViewerWallet
  const visibleListings = isOwnProfile
    ? listings
    : listings.filter(
        (listing) => listing.status === "active" && listing.seller_wallet?.toLowerCase() === normalizedProfileWallet,
      )

  useEffect(() => {
    console.log("[v0] ProfileContent mounted, wallet:", wallet)
    console.log("[v0] Current user from useWalletAuth:", currentUser)

    if (wallet) {
      console.log("[v0] Fetching profile data for wallet:", wallet)
      fetchProfileData()
    } else {
      console.log("[v0] No wallet parameter, setting loading to false")
      setIsLoading(false)
    }
  }, [wallet])

  const fetchProfileData = async () => {
    console.log("[v0] fetchProfileData started")
    setIsLoading(true)
    setIsMarketplaceLoading(true)

    try {
      const supabase = createClient()
      console.log("[v0] Supabase client created")

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .or(`wallet_address.eq.${wallet},sui_wallet_address.eq.${wallet}`)
        .single()

      console.log("[v0] User data fetch result:", { userData, userError })

      if (userError || !userData) {
        console.error("[v0] User not found or error:", userError)
        setIsLoading(false)
        notFound()
        return
      }

      setUser(userData)
      console.log("[v0] User set:", userData.display_name)

      const userWallet = userData.sui_wallet_address || userData.wallet_address
      console.log("[v0] Using wallet for queries:", userWallet)

      const { data: awardsData, error: awardsError } = await supabase
        .from("awards")
        .select(`
          *,
          challenges(id, name, description),
          organizers(org_name, wallet_address),
          organizer_inventory(
            id,
            store_items(id, name, description, rank, image_url, artist_name)
          )
        `)
        .eq("recipient_wallet", userWallet)
        .order("awarded_at", { ascending: false })

      console.log("[v0] Awards data:", { count: awardsData?.length, error: awardsError })
      if (awardsError) {
        console.error("[v0] Awards fetch error:", awardsError)
      }
      setAwards(awardsData || [])

      const holdingsQuery = supabase
        .from("user_nft_holdings")
        .select(`
          id,
          award_id,
          blockchain_object_id,
          current_owner,
          owner_acquired_at,
          metadata,
          award:awards (
            id,
            awarded_at,
            notes,
            is_sold,
            sold_at,
            sold_to_wallet,
            organizer_inventory(
              id,
              is_custom_minted,
              custom_name,
              custom_description,
              custom_image_url,
              store_items(*)
            ),
            organizers(org_name, wallet_address)
          )
        `)
        .eq("current_owner", userWallet)

      const listingsQuery = supabase
        .from("nft_listings")
        .select(`
          *,
          holding:user_nft_holdings (
            id,
            award_id,
            blockchain_object_id,
            current_owner,
            owner_acquired_at,
            award:awards (
              id,
              awarded_at,
              organizer_inventory(
                id,
                is_custom_minted,
                custom_name,
                custom_description,
                custom_image_url,
                store_items(*)
              )
            )
          )
        `)
        .or(`seller_wallet.eq.${userWallet},buyer_wallet.eq.${userWallet}`)
        .order("created_at", { ascending: false })

      const [holdingsResult, listingsResult] = await Promise.all([holdingsQuery, listingsQuery])

      if (holdingsResult.error) {
        console.error("[v0] Holdings fetch error:", holdingsResult.error)
        setHoldings([])
      } else {
        setHoldings((holdingsResult.data as UserNftHolding[]) || [])
      }

      if (listingsResult.error) {
        console.error("[v0] Listings fetch error:", listingsResult.error)
        setListings([])
      } else {
        setListings((listingsResult.data as NftListing[]) || [])
      }

      const { data: influencersData, error: influencersError } = await supabase
        .from("influences")
        .select("*, influencer:users!influences_influencer_wallet_fkey(*)")
        .eq("influenced_wallet", userWallet)
        .eq("status", "approved")

      console.log("[v0] Influencers data:", { count: influencersData?.length, error: influencersError })
      setInfluencers(influencersData || [])

      const { data: influencedData, error: influencedError } = await supabase
        .from("influences")
        .select("*, influenced:users!influences_influenced_wallet_fkey(*)")
        .eq("influencer_wallet", userWallet)
        .eq("status", "approved")

      console.log("[v0] Influenced data:", { count: influencedData?.length, error: influencedError })
      setInfluenced(influencedData || [])

      const { count, error: likesError } = await supabase
        .from("profile_likes")
        .select("*", { count: "exact", head: true })
        .eq("liked_wallet", userWallet)

      console.log("[v0] Likes count:", { count, error: likesError })
      setLikes(count || 0)

      if (currentUser) {
        const currentUserWallet = currentUser.sui_wallet_address || currentUser.wallet_address
        const { data: likeData, error: likeError } = await supabase
          .from("profile_likes")
          .select("*")
          .eq("liker_wallet", currentUserWallet)
          .eq("liked_wallet", userWallet)
          .single()

        console.log("[v0] Has liked:", { hasLiked: !!likeData, error: likeError })
        setHasLiked(!!likeData)
      }

      console.log("[v0] All data fetched successfully")
    } catch (error) {
      console.error("[v0] Error in fetchProfileData:", error)
    } finally {
      console.log("[v0] Profile data fetch complete, setting isLoading to false")
      setIsLoading(false)
      setIsMarketplaceLoading(false)
    }
  }

  const mutateListing = async (body: Record<string, unknown>, successMessage: string) => {
    try {
      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || "Marketplace update failed")
      }

      toast({ title: successMessage })
      await fetchProfileData()
    } catch (error) {
      toast({
        title: "Marketplace Error",
        description: error instanceof Error ? error.message : "Unable to update listing.",
        variant: "destructive",
      })
    }
  }

  const handleCancelListing = async (listingId: string) => {
    if (!viewerWalletAddress) return
    await mutateListing(
      {
        action: "cancel",
        listingId,
        sellerWallet: viewerWalletAddress,
      },
      "Listing cancelled",
    )
  }

  const handleReleaseListing = async (listingId: string, walletAddress: string, message: string) => {
    if (!walletAddress) return
    await mutateListing(
      {
        action: "release",
        listingId,
        wallet: walletAddress,
      },
      message,
    )
  }

  const handleLike = async () => {
    const currentUserWallet = currentUser?.sui_wallet_address || currentUser?.wallet_address
    const userWallet = user?.sui_wallet_address || user?.wallet_address

    if (!currentUser || !currentUserWallet || wallet === currentUserWallet) return

    const supabase = createClient()

    if (hasLiked) {
      await supabase.from("profile_likes").delete().eq("liker_wallet", currentUserWallet).eq("liked_wallet", userWallet)

      setLikes(likes - 1)
      setHasLiked(false)
    } else {
      await supabase.from("profile_likes").insert({
        liker_wallet: currentUserWallet,
        liked_wallet: userWallet,
      })

      setLikes(likes + 1)
      setHasLiked(true)
    }
  }

  const handleTagInfluencer = (awardId: number, badgeName: string) => {
    setSelectedAwardForInfluencer({ id: awardId, name: badgeName })
    setTagBadgeInfluencerOpen(true)
  }

  if (isLoading) {
    console.log("[v0] Rendering loading state")
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log("[v0] No user found after loading, returning null")
    return null
  }

  console.log("[v0] Rendering profile for user:", user.display_name)

  const isOrganizer = user.role === "organizer"

  const highestRankBadge = awards.reduce((highest, award) => {
    const currentRank = award.organizer_inventory?.store_items?.rank || 999
    const highestRank = highest?.organizer_inventory?.store_items?.rank || 999
    return currentRank < highestRank ? award : highest
  }, awards[0])
  const highestBadgeSold = highestRankBadge?.is_sold

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "#805AD5" // Paragon - Royal Purple
      case 2:
        return "#D69E2E" // Luminary - Gold
      case 3:
        return "#38A169" // Vanguard - Emerald Green
      case 4:
        return "#4299E1" // Adept - Blue
      case 5:
        return "#A0AEC0" // Initiate - Slate Gray
      default:
        return "#718096"
    }
  }

  const getRankName = (rank: number) => {
    switch (rank) {
      case 1:
        return "Paragon"
      case 2:
        return "Luminary"
      case 3:
        return "Vanguard"
      case 4:
        return "Adept"
      case 5:
        return "Initiate"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        {/* User Profile Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <Avatar className="h-24 w-24 transition-transform duration-300 hover:scale-110">
              <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.display_name} />
              <AvatarFallback>{user.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{user.display_name}</h2>
                <span className="text-lg text-muted-foreground font-mono">{generateUserId(wallet)}</span>
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-2 font-mono text-sm">{wallet}</p>
              {user.bio && <p className="text-foreground">{user.bio}</p>}

              <div className="flex flex-wrap items-center gap-3 mt-4">
                {isOwnProfile && (
                  <>
                    <EditProfileInline
                      wallet={wallet}
                      displayName={user.display_name}
                      bio={user.bio}
                      avatarUrl={user.avatar_url}
                      onUpdate={fetchProfileData}
                    />
                    <Button
                      onClick={() => setQrCodeOpen(true)}
                      variant="outline"
                      size="sm"
                      className="gap-2 transition-all duration-300 hover:scale-105"
                    >
                      <QrCode className="w-4 h-4" />
                      Show QR Code
                    </Button>
                  </>
                )}
                {!isOwnProfile && (
                  <>
                    <Button
                      onClick={handleLike}
                      variant={hasLiked ? "default" : "outline"}
                      size="sm"
                      className="gap-2 transition-all duration-300 hover:scale-105"
                    >
                      <HeartIcon className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
                      {hasLiked ? "Liked" : "Like"}
                    </Button>
                    <Button
                      onClick={() => setTagInfluencerOpen(true)}
                      variant="outline"
                      size="sm"
                      className="gap-2 transition-all duration-300 hover:scale-105"
                    >
                      <UserPlusIcon className="w-4 h-4" />
                      Tag as Influencer
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HeartIcon className="w-4 h-4" />
                  <span>
                    {likes} {likes === 1 ? "like" : "likes"}
                  </span>
                </div>
                {isOrganizer && (
                  <Button
                    onClick={() => setSelectOrgOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all duration-300 hover:scale-105 bg-transparent"
                  >
                    <BuildingIcon className="w-4 h-4" />
                    View Organization
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {highestRankBadge && (
          <div className="mb-8 animate-fade-in">
            <Card
              className="overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              style={{ borderColor: getRankColor(highestRankBadge.organizer_inventory?.store_items?.rank || 5) }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AwardIcon className="w-5 h-5" />
                  Highest Achievement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src={
                        highestRankBadge.organizer_inventory?.store_items?.image_url ||
                        `/placeholder.svg?height=150&width=150&query=badge` ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg" ||
                        "/placeholder.svg"
                      }
                      alt={highestRankBadge.organizer_inventory?.store_items?.name || "Badge"}
                      className={`w-32 h-32 object-cover rounded-lg ${
                        highestBadgeSold ? "opacity-60 grayscale" : ""
                      }`}
                    />
                    <Badge
                      className="absolute -top-2 -right-2"
                      style={{
                        backgroundColor: getRankColor(highestRankBadge.organizer_inventory?.store_items?.rank || 5),
                      }}
                    >
                      {getRankName(highestRankBadge.organizer_inventory?.store_items?.rank || 5)}
                    </Badge>
                    {highestBadgeSold && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-center px-2">
                        <Badge variant="outline" className="mb-1">
                          Sold
                        </Badge>
                        <p className="text-xs text-muted-foreground">Transferred to another member</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">
                      {highestRankBadge.organizer_inventory?.store_items?.name || "Badge"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {highestRankBadge.organizer_inventory?.store_items?.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Awarded by{" "}
                      <Link
                        href={`/org/${highestRankBadge.awarded_by}`}
                        className="text-primary hover:underline transition-colors"
                      >
                        {highestRankBadge.organizers.org_name}
                      </Link>
                    </p>
                    {highestBadgeSold && highestRankBadge.sold_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Sold on {new Date(highestRankBadge.sold_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Influences section for own profile */}
        {isOwnProfile && (
          <div className="mb-8">
            <PendingInfluences />
          </div>
        )}

        <div className="mb-8">
          <h3 className="text-2xl font-bold text-foreground mb-4">Earned Badges</h3>
          {awards.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {awards.map((award, index) => {
                const isSold = Boolean(award.is_sold)
                return (
                  <Card
                    key={award.id}
                    className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      <img
                        src={
                          award.organizer_inventory?.store_items?.image_url ||
                          `/placeholder.svg?height=300&width=300&query=badge` ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg" ||
                          "/placeholder.svg"
                        }
                        alt={award.organizer_inventory?.store_items?.name || "Badge"}
                        className={`w-full h-full object-cover ${isSold ? "opacity-60 grayscale" : ""}`}
                      />
                      <Badge
                        className="absolute top-2 right-2"
                        style={{
                          backgroundColor: getRankColor(award.organizer_inventory?.store_items?.rank || 5),
                        }}
                      >
                        {getRankName(award.organizer_inventory?.store_items?.rank || 5)}
                      </Badge>
                      {isSold && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center px-3">
                          <Badge variant="outline" className="mb-1">
                            Sold
                          </Badge>
                          <p className="text-xs text-muted-foreground">Ownership transferred</p>
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {award.organizer_inventory?.store_items?.name || "Badge"}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {award.organizer_inventory?.store_items?.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <BuildingIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Awarded by</span>
                        <Link
                          href={`/org/${award.awarded_by}`}
                          className="text-primary hover:underline transition-colors font-medium"
                        >
                          {award.organizers.org_name}
                        </Link>
                      </div>
                      {award.notes && (
                        <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                          "{award.notes}"
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{new Date(award.awarded_at).toLocaleDateString()}</p>
                          {isSold && award.sold_at && (
                            <p className="italic">Sold {new Date(award.sold_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <Link href={`/challenges/${award.challenge_id}`}>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                            View Challenge
                            <ExternalLinkIcon className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="animate-fade-in">
              <CardContent className="py-12 text-center">
                <AwardIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No badges earned yet.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">NFT Inventory</h3>
            {isOwnProfile && (
              <p className="text-sm text-muted-foreground">{holdings.length} on-chain NFT{holdings.length === 1 ? "" : "s"}</p>
            )}
          </div>
          {isMarketplaceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-b-2 border-primary rounded-full animate-spin" />
            </div>
          ) : holdings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {holdings.map((holding) => {
                const image =
                  holding.award?.organizer_inventory?.custom_image_url ||
                  holding.award?.organizer_inventory?.store_items?.image_url ||
                  "/placeholder.svg"
                const name =
                  holding.award?.organizer_inventory?.custom_name ||
                  holding.award?.organizer_inventory?.store_items?.name ||
                  "Custom NFT"
                const activeListing = listings.find(
                  (listing) =>
                    listing.holding_id === holding.id && MARKETPLACE_ACTIVE_STATUSES.includes(listing.status),
                )

                return (
                  <Card key={holding.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted relative">
                      <img src={image} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{name}</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground break-all">
                        {holding.blockchain_object_id}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Owned since {new Date(holding.owner_acquired_at).toLocaleDateString()}
                      </p>
                      {isOwnProfile ? (
                        activeListing ? (
                          <div className="space-y-2">
                            <Badge className={`${LISTING_STATUS_STYLES[activeListing.status]} text-xs`}>
                              {LISTING_STATUS_COPY[activeListing.status]}
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              Listed for {Number(activeListing.price_sui).toLocaleString(undefined, { maximumFractionDigits: 4 })} SUI
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {activeListing.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancelListing(activeListing.id)}
                                >
                                  Cancel Listing
                                </Button>
                              )}
                              {activeListing.status === "payment_pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleReleaseListing(
                                      activeListing.id,
                                      viewerWalletAddress,
                                      "Reservation released",
                                    )
                                  }
                                >
                                  Release Reservation
                                </Button>
                              )}
                              {activeListing.status === "awaiting_transfer" && (
                                <CompleteSaleDialog
                                  listing={activeListing}
                                  sellerWallet={viewerWalletAddress}
                                  onSuccess={fetchProfileData}
                                >
                                  <Button size="sm">Complete Transfer</Button>
                                </CompleteSaleDialog>
                              )}
                            </div>
                          </div>
                        ) : (
                          <SellNftDialog
                            holding={holding}
                            sellerWallet={viewerWalletAddress}
                            onSuccess={fetchProfileData}
                            trigger={
                              <Button variant="outline" size="sm">
                                Sell NFT
                              </Button>
                            }
                          />
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">Owned by this user.</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <p className="text-muted-foreground">No NFTs in inventory.</p>
                {isOwnProfile && <p className="text-sm text-muted-foreground">Earn or buy NFTs to populate this list.</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">
              {isOwnProfile ? "Marketplace Activity" : "Available NFTs from this user"}
            </h3>
          </div>
          {isMarketplaceLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-b-2 border-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {visibleListings.length > 0 ? (
                visibleListings.map((listing) => {
                    const listingName =
                      listing.holding?.award?.organizer_inventory?.custom_name ||
                      listing.holding?.award?.organizer_inventory?.store_items?.name ||
                      "NFT Badge"
                    const listingImage =
                      listing.holding?.award?.organizer_inventory?.custom_image_url ||
                      listing.holding?.award?.organizer_inventory?.store_items?.image_url ||
                      "/placeholder.svg"
                    const priceLabel = Number(listing.price_sui).toLocaleString(undefined, { maximumFractionDigits: 4 })
                    const isSeller = listing.seller_wallet?.toLowerCase() === normalizedViewerWallet
                    const isBuyer = listing.buyer_wallet?.toLowerCase() === normalizedViewerWallet

                    return (
                      <Card key={listing.id} className="overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                          <img src={listingImage} alt={listingName} className="md:w-48 h-40 object-cover" />
                          <div className="flex-1 p-4 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="font-semibold">{listingName}</p>
                                <p className="text-sm text-muted-foreground">Price: {priceLabel} SUI</p>
                              </div>
                              <Badge className={`${LISTING_STATUS_STYLES[listing.status]} text-xs`}>
                                {LISTING_STATUS_COPY[listing.status]}
                              </Badge>
                            </div>
                            {listing.status === "active" && !isSeller && (
                              <PurchaseNftDialog listing={listing} buyerWallet={viewerWalletAddress} onSuccess={fetchProfileData}>
                                <Button size="sm">Purchase</Button>
                              </PurchaseNftDialog>
                            )}
                            {listing.status === "payment_pending" && isBuyer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReleaseListing(listing.id, viewerWalletAddress, "Purchase request cancelled")
                                }
                              >
                                Cancel Purchase Request
                              </Button>
                            )}
                            {listing.status === "awaiting_transfer" && isBuyer && (
                              <p className="text-sm text-muted-foreground">
                                Awaiting seller transfer. Payment hash: {listing.payment_transaction_hash}
                              </p>
                            )}
                            {listing.status === "completed" && (
                              <p className="text-sm text-muted-foreground">
                                Completed on {listing.transfer_completed_at ? new Date(listing.transfer_completed_at).toLocaleDateString() : "N/A"}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    {isOwnProfile ? "No marketplace activity yet." : "This user is not selling any NFTs right now."}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs for influencer tagging */}
      <TagInfluencerDialog
        open={tagInfluencerOpen}
        onOpenChange={setTagInfluencerOpen}
        influencerWallet={wallet}
        influencerName={user?.display_name || ""}
        onSuccess={fetchProfileData}
      />

      {/* Organization selector dialog */}
      <SelectOrganizationDialog open={selectOrgOpen} onOpenChange={setSelectOrgOpen} userWallet={wallet} />

      {/* QR Code Dialog */}
      <ShowQRCodeDialog
        open={qrCodeOpen}
        onOpenChange={setQrCodeOpen}
        walletAddress={wallet}
        displayName={user?.display_name || ""}
      />
    </div>
  )
}
