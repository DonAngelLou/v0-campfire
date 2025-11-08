"use client"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, UserPlus, Trash2, Crown, Shield, User, Search } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { generateUserId } from "@/lib/utils"

interface TeamMember {
  id: string
  user_id: string
  role: "admin" | "staff" | "facilitator"
  added_at: string
  user_name?: string
}

interface OrgUser {
  wallet_address: string
  display_name: string
  avatar_url?: string
}

interface ManageEventTeamDialogProps {
  eventId: string
  eventName: string
  organizationId: string
  userRole: "admin" | "staff" | "facilitator"
  onTeamUpdate?: () => void
}

export function ManageEventTeamDialog({
  eventId,
  eventName,
  organizationId,
  userRole,
  onTeamUpdate,
}: ManageEventTeamDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<OrgUser[]>([])
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null)
  const [newMemberRole, setNewMemberRole] = useState<"staff" | "facilitator">("staff")
  const [isAdding, setIsAdding] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (open) {
      fetchTeamMembers()
    }
  }, [open, eventId])

  useEffect(() => {
    const searchOrgUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const supabase = createClient()

      const { data: orgMembers, error: orgError } = await supabase
        .from("organization_members")
        .select("user_wallet")
        .eq("organization_wallet", organizationId)
        .eq("status", "active")

      if (orgError || !orgMembers) {
        console.error("[v0] Error fetching org members:", orgError)
        setSearchResults([])
        setIsSearching(false)
        return
      }

      const walletAddresses = orgMembers.map((m) => m.user_wallet)

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("wallet_address, display_name, avatar_url")
        .in("wallet_address", walletAddresses)

      if (usersError) {
        console.error("[v0] Error searching users:", usersError)
        setSearchResults([])
      } else {
        const filtered = (users || []).filter((u) => {
          const userId = generateUserId(u.wallet_address)
          const matchesName = u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
          const matchesId = userId.toLowerCase().includes(searchQuery.toLowerCase())
          return matchesName || matchesId
        })

        setSearchResults(filtered.slice(0, 10))
      }

      setIsSearching(false)
    }

    const debounce = setTimeout(searchOrgUsers, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, organizationId])

  const fetchTeamMembers = async () => {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("event_team_members")
      .select("id, user_id, role, added_at")
      .eq("event_id", eventId)
      .order("role", { ascending: true })
      .order("added_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching team members:", error)
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      })
    } else {
      const membersWithNames = await Promise.all(
        (data || []).map(async (member) => {
          const { data: userData } = await supabase
            .from("users")
            .select("display_name")
            .eq("wallet_address", member.user_id)
            .single()

          return {
            ...member,
            user_name: userData?.display_name || member.user_id,
          }
        }),
      )
      setTeamMembers(membersWithNames)
    }

    setIsLoading(false)
  }

  const handleSelectUser = (user: OrgUser) => {
    setSelectedUser(user)
    setSearchQuery(user.display_name)
    setSearchResults([])
  }

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user from the search results",
        variant: "destructive",
      })
      return
    }

    setIsAdding(true)
    const supabase = createClient()

    const { data: existingMember } = await supabase
      .from("event_team_members")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", selectedUser.wallet_address)
      .single()

    if (existingMember) {
      toast({
        title: "Error",
        description: "This user is already a team member",
        variant: "destructive",
      })
      setIsAdding(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from("event_team_members").insert({
      event_id: eventId,
      user_id: selectedUser.wallet_address,
      role: newMemberRole,
      added_by: user?.id || selectedUser.wallet_address,
    })

    if (insertError) {
      console.error("[v0] Error adding team member:", insertError)
      toast({
        title: "Error",
        description: `Failed to add team member: ${insertError.message}`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: `${selectedUser.display_name} added as ${newMemberRole}`,
      })
      setSearchQuery("")
      setSelectedUser(null)
      fetchTeamMembers()
      onTeamUpdate?.()
    }

    setIsAdding(false)
  }

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === "admin") {
      toast({
        title: "Error",
        description: "Cannot remove event admins",
        variant: "destructive",
      })
      return
    }

    const supabase = createClient()

    const { error } = await supabase.from("event_team_members").delete().eq("id", memberId)

    if (error) {
      console.error("[v0] Error removing team member:", error)
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Team member removed",
      })
      fetchTeamMembers()
      onTeamUpdate?.()
    }
  }

  if (userRole !== "admin") {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Manage Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Event Team</DialogTitle>
          <DialogDescription>{eventName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Member Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Organization Members</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name or user ID"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setSelectedUser(null)
                    }}
                    className="pl-10"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="border rounded-lg bg-background shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.wallet_address}
                        onClick={() => handleSelectUser(result)}
                        className="w-full p-3 hover:bg-muted transition-colors text-left flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{result.display_name}</p>
                          <p className="text-sm text-muted-foreground">{generateUserId(result.wallet_address)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}
                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className="text-sm text-muted-foreground">No organization members found</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newMemberRole}
                  onValueChange={(value: "staff" | "facilitator") => setNewMemberRole(value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="facilitator">Facilitator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Staff and Facilitators can approve challenge submissions
                </p>
              </div>
              <Button onClick={handleAddMember} disabled={isAdding || !selectedUser} className="w-full">
                {isAdding ? "Adding..." : selectedUser ? `Add ${selectedUser.display_name}` : "Select a user first"}
              </Button>
            </div>
          </div>

          {/* Current Team Members List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Team Members ({teamMembers.length})</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No team members added yet</p>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {member.role === "admin" ? (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      ) : member.role === "staff" ? (
                        <Shield className="w-5 h-5 text-blue-500" />
                      ) : (
                        <User className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-medium">{member.user_name}</p>
                        <p className="text-sm text-muted-foreground">{generateUserId(member.user_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          member.role === "admin"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : member.role === "staff"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-green-500/10 text-green-500"
                        }`}
                      >
                        {member.role}
                      </span>
                      {member.role !== "admin" && (
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id, member.role)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
