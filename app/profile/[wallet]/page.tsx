"use client"

import { useEffect, useState } from "react"
import { notFound, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AwardIcon, HeartIcon, BuildingIcon, UserPlusIcon, ExternalLinkIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { TagInfluencerDialog } from "@/components/tag-influencer-dialog"
import { PendingInfluences } from "@/components/pending-influences"
import { generateUserId } from "@/lib/utils"
import { EditProfileInline } from "@/components/edit-profile-inline"
import { SelectOrganizationDialog } from "@/components/select-organization-dialog"

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
}

interface Influence {
  influencer: User
  influenced: User
  award_id: number | null
  status: "pending" | "approved" | "rejected"
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

  useEffect(() => {
    if (wallet) {
      console.log("[v0] Fetching profile data for wallet:", wallet)
      fetchProfileData()
    }
  }, [wallet])

  const fetchProfileData = async () => {
    console.log("[v0] Starting fetchProfileData for wallet:", wallet)
    const supabase = createClient()

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .or(`wallet_address.eq.${wallet},sui_wallet_address.eq.${wallet}`)
      .single()

    console.log("[v0] User data fetch result:", { userData, userError })

    if (userError || !userData) {
      console.error("[v0] User not found or error:", userError)
      notFound()
      return
    }

    setUser(userData)

    const userWallet = userData.sui_wallet_address || userData.wallet_address

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

    console.log("[v0] Awards data:", { awardsData, awardsError })
    setAwards(awardsData || [])

    const { data: influencersData } = await supabase
      .from("influences")
      .select("*, influencer:users!influences_influencer_wallet_fkey(*)")
      .eq("influenced_wallet", userWallet)
      .eq("status", "approved")

    setInfluencers(influencersData || [])

    const { data: influencedData } = await supabase
      .from("influences")
      .select("*, influenced:users!influences_influenced_wallet_fkey(*)")
      .eq("influencer_wallet", userWallet)
      .eq("status", "approved")

    setInfluenced(influencedData || [])

    const { count } = await supabase
      .from("profile_likes")
      .select("*", { count: "exact", head: true })
      .eq("liked_wallet", userWallet)

    setLikes(count || 0)

    if (currentUser) {
      const currentUserWallet = currentUser.sui_wallet_address || currentUser.wallet_address
      const { data: likeData } = await supabase
        .from("profile_likes")
        .select("*")
        .eq("liker_wallet", currentUserWallet)
        .eq("liked_wallet", userWallet)
        .single()

      setHasLiked(!!likeData)
    }

    console.log("[v0] Profile data fetch complete, setting isLoading to false")
    setIsLoading(false)
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
    console.log("[v0] No user found, returning null")
    return null
  }

  console.log("[v0] Rendering profile for user:", user.display_name)

  const currentUserWallet = currentUser?.sui_wallet_address || currentUser?.wallet_address
  const userWallet = user.sui_wallet_address || user.wallet_address
  const isOwnProfile = currentUserWallet === userWallet
  const isOrganizer = user.role === "organizer"

  const highestRankBadge = awards.reduce((highest, award) => {
    const currentRank = award.organizer_inventory?.store_items?.rank || 999
    const highestRank = highest?.organizer_inventory?.store_items?.rank || 999
    return currentRank < highestRank ? award : highest
  }, awards[0])

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
          <div className="flex items-start gap-6">
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

              <div className="flex items-center gap-4 mt-4">
                {isOwnProfile && (
                  <EditProfileInline
                    wallet={wallet}
                    displayName={user.display_name}
                    bio={user.bio}
                    avatarUrl={user.avatar_url}
                    onUpdate={fetchProfileData}
                  />
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
                        "/placeholder.svg"
                      }
                      alt={highestRankBadge.organizer_inventory?.store_items?.name || "Badge"}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <Badge
                      className="absolute -top-2 -right-2"
                      style={{
                        backgroundColor: getRankColor(highestRankBadge.organizer_inventory?.store_items?.rank || 5),
                      }}
                    >
                      {getRankName(highestRankBadge.organizer_inventory?.store_items?.rank || 5)}
                    </Badge>
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
              {awards.map((award, index) => (
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
                        "/placeholder.svg"
                      }
                      alt={award.organizer_inventory?.store_items?.name || "Badge"}
                      className="w-full h-full object-cover"
                    />
                    <Badge
                      className="absolute top-2 right-2"
                      style={{
                        backgroundColor: getRankColor(award.organizer_inventory?.store_items?.rank || 5),
                      }}
                    >
                      {getRankName(award.organizer_inventory?.store_items?.rank || 5)}
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{award.organizer_inventory?.store_items?.name || "Badge"}</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{new Date(award.awarded_at).toLocaleDateString()}</p>
                      <Link href={`/challenges/${award.challenge_id}`}>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          View Challenge
                          <ExternalLinkIcon className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
    </div>
  )
}
