import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Flame, ArrowLeft, Search } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { SearchFilters } from "@/components/search-filters"

interface BrowsePageProps {
  searchParams: Promise<{
    search?: string
    organizer?: string
  }>
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams
  const searchQuery = params.search?.toLowerCase() || ""
  const organizerFilter = params.organizer || ""

  const supabase = getSupabase()

  // Fetch all badge templates with organizer info
  let query = supabase.from("badge_templates").select("*, organizers(*)").order("created_at", { ascending: false })

  if (organizerFilter) {
    query = query.eq("organizer_wallet", organizerFilter)
  }

  const { data: badgeTemplates } = await query

  // Filter by search query on the client side for simplicity
  const filteredBadges = badgeTemplates?.filter((badge) => {
    if (!searchQuery) return true
    return (
      badge.name.toLowerCase().includes(searchQuery) ||
      badge.description?.toLowerCase().includes(searchQuery) ||
      badge.criteria?.toLowerCase().includes(searchQuery)
    )
  })

  // Fetch all organizers for the filter dropdown
  const { data: organizers } = await supabase.from("organizers").select("*, users(*)").order("org_name")

  // Get award counts for each badge
  const badgeIds = filteredBadges?.map((b) => b.id) || []
  const { data: awardCounts } = await supabase
    .from("awards")
    .select("badge_template_id")
    .in("badge_template_id", badgeIds)

  const awardCountMap = awardCounts?.reduce(
    (acc, award) => {
      acc[award.badge_template_id] = (acc[award.badge_template_id] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
              <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Browse Badges</h2>
          <p className="text-muted-foreground">Discover all available badge templates and achievements</p>
        </div>

        {/* Search and Filters */}
        <SearchFilters organizers={organizers || []} currentSearch={searchQuery} currentOrganizer={organizerFilter} />

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBadges?.length || 0} badge{filteredBadges?.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Badge Grid */}
        {filteredBadges && filteredBadges.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge) => (
              <Card key={badge.id} className="overflow-hidden hover:border-primary transition-colors">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img
                    src={badge.image_url || "/placeholder.svg"}
                    alt={badge.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg">{badge.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {awardCountMap?.[badge.id] || 0} awarded
                    </Badge>
                  </div>
                  <CardDescription>{badge.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Criteria:</p>
                    <p className="text-sm text-muted-foreground">{badge.criteria}</p>
                  </div>

                  {/* Organizer Info */}
                  <Link
                    href={`/organizer/${badge.organizer_wallet}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={badge.organizers.org_logo_url || "/placeholder.svg"}
                        alt={badge.organizers.org_name}
                      />
                      <AvatarFallback>{badge.organizers.org_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{badge.organizers.org_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{badge.organizer_wallet}</p>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No badges found matching your criteria.</p>
              <Link href="/browse">
                <Button variant="outline" className="mt-4 bg-transparent">
                  Clear Filters
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
