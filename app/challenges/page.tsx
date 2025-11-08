"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, Building2, Users, Ticket, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { ProtectedRoute } from "@/components/protected-route"
import { AppHeader } from "@/components/app-header"

interface Event {
  id: string
  name: string
  description: string
  image_url: string | null
  status: "draft" | "open" | "ongoing" | "completed"
  start_date: string | null
  end_date: string | null
  location: string | null
  ticket_enabled: boolean
  ticket_price: number
  organization_id: string
  created_at: string
  organizers: {
    org_name: string
    wallet_address: string
  }
  event_registrations?: any[]
  event_challenges?: any[]
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsContent />
    </ProtectedRoute>
  )
}

function EventsContent() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [ticketFilter, setTicketFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [orgSuggestions, setOrgSuggestions] = useState<{ name: string; wallet: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
    updateOrgSuggestions()
  }, [events, searchQuery, statusFilter, ticketFilter])

  const fetchEvents = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from("events")
      .select(
        `
        *,
        organizers!events_organization_id_fkey(org_name, wallet_address),
        event_registrations(id),
        event_challenges(id)
      `,
      )
      .in("status", ["open", "ongoing"])
      .order("created_at", { ascending: false })

    setEvents(data || [])
    setIsLoading(false)
  }

  const updateOrgSuggestions = () => {
    if (!searchQuery) {
      setOrgSuggestions([])
      setShowSuggestions(false)
      return
    }

    const uniqueOrgs = events.reduce(
      (acc, event) => {
        const orgName = event.organizers?.org_name?.toLowerCase() || ""
        if (orgName.includes(searchQuery.toLowerCase()) && !acc.some((o) => o.name === event.organizers.org_name)) {
          acc.push({
            name: event.organizers.org_name,
            wallet: event.organizers.wallet_address,
          })
        }
        return acc
      },
      [] as { name: string; wallet: string }[],
    )

    setOrgSuggestions(uniqueOrgs.slice(0, 5))
    setShowSuggestions(uniqueOrgs.length > 0)
  }

  const filterEvents = () => {
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.organizers?.org_name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => event.status === statusFilter)
    }

    if (ticketFilter === "free") {
      filtered = filtered.filter((event) => !event.ticket_enabled || event.ticket_price === 0)
    } else if (ticketFilter === "paid") {
      filtered = filtered.filter((event) => event.ticket_enabled && event.ticket_price > 0)
    }

    setFilteredEvents(filtered)
  }

  const handleOrgSelect = (orgName: string) => {
    setSearchQuery(orgName)
    setShowSuggestions(false)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default"
      case "ongoing":
        return "default"
      case "completed":
        return "outline"
      case "draft":
        return "secondary"
      default:
        return "secondary"
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">Browse Events</h1>
          <p className="text-muted-foreground">
            Discover and register for events to earn badges and participate in challenges
          </p>
        </div>

        <div className="mb-8 space-y-4 animate-slide-up animation-delay-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search events or organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              className="pl-10"
            />
            {showSuggestions && orgSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2 px-2">Organizations</p>
                  {orgSuggestions.map((org) => (
                    <button
                      key={org.wallet}
                      onClick={() => handleOrgSelect(org.name)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-sm transition-colors flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{org.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ticketFilter} onValueChange={setTicketFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="free">Free Events</SelectItem>
                <SelectItem value="paid">Paid Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredEvents.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <Card
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-fade-in cursor-pointer h-full flex flex-col"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img
                    src={
                      event.image_url ||
                      `/placeholder.svg?height=300&width=300&query=${encodeURIComponent(event.name + " event") || "/placeholder.svg"}`
                    }
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
                    <Badge variant={getStatusVariant(event.status)} className="shrink-0">
                      {event.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.start_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.start_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{event.event_registrations?.length || 0} registered</span>
                    </div>

                    {event.ticket_enabled && (
                      <Badge variant="outline" className="gap-1">
                        <Ticket className="w-3 h-3" />
                        {event.ticket_price > 0 ? `${event.ticket_price} SUI` : "Free"}
                      </Badge>
                    )}
                  </div>

                  {event.organizers && (
                    <Link
                      href={`/org/${event.organization_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors pt-2 border-t"
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="line-clamp-1">{event.organizers.org_name}</span>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="animate-fade-in">
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No events found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
