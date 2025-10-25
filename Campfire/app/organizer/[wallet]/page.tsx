import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Flame, ArrowLeft, CheckCircle2, Award, Users } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { CreateBadgeDialog } from "@/components/create-badge-dialog"
import { AwardBadgeDialog } from "@/components/award-badge-dialog"

interface OrganizerPageProps {
  params: Promise<{
    wallet: string
  }>
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { wallet } = await params
  const supabase = getSupabase()

  // Fetch organizer data
  const { data: organizer, error: orgError } = await supabase
    .from("organizers")
    .select("*, users(*)")
    .eq("wallet_address", wallet)
    .single()

  if (orgError || !organizer) {
    notFound()
  }

  // Fetch badge templates created by this organizer
  const { data: badgeTemplates } = await supabase
    .from("badge_templates")
    .select("*")
    .eq("organizer_wallet", wallet)
    .order("created_at", { ascending: false })

  // Fetch awards issued by this organizer
  const { data: awards } = await supabase
    .from("awards")
    .select("*, badge_templates(*), users(*)")
    .eq("awarded_by", wallet)
    .order("awarded_at", { ascending: false })

  // Fetch all users for the award dialog
  const { data: allUsers } = await supabase.from("users").select("*").order("display_name")

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
        {/* Organizer Profile */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={organizer.org_logo_url || "/placeholder.svg"} alt={organizer.org_name} />
              <AvatarFallback>{organizer.org_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-foreground">{organizer.org_name}</h2>
                {organizer.verified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-2">
                {organizer.users.display_name} ({wallet})
              </p>
              <p className="text-foreground">{organizer.org_description}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Badge Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{badgeTemplates?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Badges Awarded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{awards?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{new Set(awards?.map((a) => a.recipient_wallet)).size || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badge Templates Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-foreground">Badge Templates</h3>
            <CreateBadgeDialog organizerWallet={wallet} />
          </div>

          {badgeTemplates && badgeTemplates.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {badgeTemplates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <img
                      src={template.image_url || "/placeholder.svg"}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      <span className="font-medium">Criteria:</span> {template.criteria}
                    </p>
                    <AwardBadgeDialog badgeTemplate={template} organizerWallet={wallet} users={allUsers || []} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No badge templates yet. Create your first one!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Awards Section */}
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-4">Recent Awards</h3>
          {awards && awards.length > 0 ? (
            <div className="space-y-4">
              {awards.map((award) => (
                <Card key={award.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={award.badge_templates.image_url || "/placeholder.svg"}
                          alt={award.badge_templates.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{award.badge_templates.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Awarded to{" "}
                          <Link href={`/profile/${award.recipient_wallet}`} className="text-primary hover:underline">
                            {award.users.display_name}
                          </Link>
                        </p>
                        {award.notes && <p className="text-sm text-muted-foreground mt-1">"{award.notes}"</p>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(award.awarded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No badges awarded yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
