"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Award } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface AwardBadgeDialogProps {
  badgeTemplate: {
    id: string
    name: string
  }
  organizerWallet: string
  users: Array<{
    wallet_address: string
    display_name: string
  }>
}

export function AwardBadgeDialog({ badgeTemplate, organizerWallet, users }: AwardBadgeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState("")
  const [notes, setNotes] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setLoading(true)

    const supabase = getSupabase()
    const { error } = await supabase.from("awards").insert({
      badge_template_id: badgeTemplate.id,
      recipient_wallet: selectedUser,
      awarded_by: organizerWallet,
      notes: notes || null,
    })

    setLoading(false)

    if (!error) {
      setOpen(false)
      setSelectedUser("")
      setNotes("")
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-transparent">
          <Award className="h-4 w-4 mr-2" />
          Award Badge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Award Badge: {badgeTemplate.name}</DialogTitle>
            <DialogDescription>Select a user to award this badge to.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user">Recipient</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.wallet_address} value={user.wallet_address}>
                      {user.display_name} ({user.wallet_address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add a personal message or reason for this award"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedUser}>
              {loading ? "Awarding..." : "Award Badge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
