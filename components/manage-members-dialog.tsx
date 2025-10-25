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
import { Users, UserPlus, Trash2, Crown, Shield, Search } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { generateUserId } from "@/lib/utils"

interface Member {
  id: number
  user_wallet: string
  role: string
  status: string
  invited_at: string
  accepted_at: string | null
  user_name?: string
}

interface User {
  wallet_address: string
  display_name: string
  avatar_url?: string
}

interface ManageMembersDialogProps {
  organizationWallet: string
  organizationName: string
  userRole: string
}

export function ManageMembersDialog({ organizationWallet, organizationName, userRole }: ManageMembersDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newMemberRole, setNewMemberRole] = useState<"admin">("admin")
  const [isInviting, setIsInviting] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMembers()
    }
  }, [open, organizationWallet])

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      const supabase = createClient()

      console.log("[v0] Searching for users with query:", searchQuery)

      // Fetch all users and filter client-side
      const { data, error } = await supabase.from("users").select("wallet_address, display_name, avatar_url")

      if (error) {
        console.error("[v0] Error searching users:", error)
        setSearchResults([])
      } else {
        // Filter by name or generated user ID
        const filtered = (data || []).filter((u) => {
          const userId = generateUserId(u.wallet_address)
          const matchesName = u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
          const matchesId = userId.toLowerCase().includes(searchQuery.toLowerCase())
          return matchesName || matchesId
        })

        console.log("[v0] Found matching users:", filtered.length)
        setSearchResults(filtered.slice(0, 10)) // Limit to 10 results
      }

      setIsSearching(false)
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const fetchMembers = async () => {
    setIsLoading(true)
    const supabase = createClient()

    console.log("[v0] Fetching members for organization:", organizationWallet)

    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        user_wallet,
        role,
        status,
        invited_at,
        accepted_at
      `)
      .eq("organization_wallet", organizationWallet)
      .order("role", { ascending: true })
      .order("invited_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching members:", error)
      toast({
        title: "Error",
        description: "Failed to load organization members",
        variant: "destructive",
      })
    } else {
      console.log("[v0] Fetched members:", data?.length || 0)
      // Fetch user names for each member
      const membersWithNames = await Promise.all(
        (data || []).map(async (member) => {
          const { data: userData } = await supabase
            .from("users")
            .select("display_name")
            .eq("wallet_address", member.user_wallet)
            .single()

          return {
            ...member,
            user_name: userData?.display_name || member.user_wallet,
          }
        }),
      )
      setMembers(membersWithNames)
    }

    setIsLoading(false)
  }

  const handleSelectUser = (user: User) => {
    console.log("[v0] Selected user:", user)
    setSelectedUser(user)
    setSearchQuery(user.display_name)
    setSearchResults([])
  }

  const handleInviteMember = async () => {
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Please select a user from the search results",
        variant: "destructive",
      })
      return
    }

    setIsInviting(true)
    const supabase = createClient()

    console.log("[v0] Inviting member:", selectedUser.wallet_address, "to organization:", organizationWallet)

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_wallet", organizationWallet)
      .eq("user_wallet", selectedUser.wallet_address)
      .single()

    if (existingMember) {
      console.log("[v0] User is already a member")
      toast({
        title: "Error",
        description: "This user is already a member of the organization",
        variant: "destructive",
      })
      setIsInviting(false)
      return
    }

    // Add member
    const { data: insertData, error: insertError } = await supabase
      .from("organization_members")
      .insert({
        organization_wallet: organizationWallet,
        user_wallet: selectedUser.wallet_address,
        role: newMemberRole,
        status: "active",
        invited_by: user?.wallet_address,
        accepted_at: new Date().toISOString(),
      })
      .select()

    if (insertError) {
      console.error("[v0] Error inviting member:", insertError)
      toast({
        title: "Error",
        description: `Failed to add member: ${insertError.message}`,
        variant: "destructive",
      })
    } else {
      console.log("[v0] Successfully added member:", insertData)
      toast({
        title: "Success",
        description: `${selectedUser.display_name} added as ${newMemberRole}`,
      })
      setSearchQuery("")
      setSelectedUser(null)
      fetchMembers()
    }

    setIsInviting(false)
  }

  const handleRemoveMember = async (memberId: number, memberWallet: string, memberRole: string) => {
    if (memberRole === "owner") {
      toast({
        title: "Error",
        description: "Cannot remove the organization owner",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Removing member:", memberId)

    const supabase = createClient()

    const { error } = await supabase.from("organization_members").delete().eq("id", memberId)

    if (error) {
      console.error("[v0] Error removing member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    } else {
      console.log("[v0] Successfully removed member")
      toast({
        title: "Success",
        description: "Member removed from organization",
      })
      fetchMembers()
    }
  }

  // Only owners and admins can manage members
  if (userRole !== "owner" && userRole !== "admin") {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Organization Members</DialogTitle>
          <DialogDescription>{organizationName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Member Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add New Member
            </h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search by Name or User ID</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="e.g., Alice or #0384"
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
                        <p className="text-xs text-muted-foreground">{result.wallet_address}</p>
                      </button>
                    ))}
                  </div>
                )}
                {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}
                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <p className="text-sm text-muted-foreground">No users found</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newMemberRole} onValueChange={(value: "admin") => setNewMemberRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInviteMember} disabled={isInviting || !selectedUser} className="w-full">
                {isInviting ? "Adding..." : selectedUser ? `Add ${selectedUser.display_name}` : "Select a user first"}
              </Button>
            </div>
          </div>

          {/* Current Members List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Current Members ({members.length})</h3>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {member.role === "owner" ? (
                        <Crown className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Shield className="w-5 h-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{member.user_name}</p>
                        <p className="text-sm text-muted-foreground">{member.user_wallet}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full capitalize ${
                          member.role === "owner" ? "bg-yellow-500/10 text-yellow-500" : "bg-blue-500/10 text-blue-500"
                        }`}
                      >
                        {member.role}
                      </span>
                      {member.role !== "owner" && userRole === "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, member.user_wallet, member.role)}
                        >
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
