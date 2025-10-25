"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, Package, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}

interface Challenge {
  id: number
  name: string
}

interface Application {
  id: number
  applicant_wallet: string
  status: "pending" | "approved" | "rejected"
  applied_at: string
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
}

interface InventoryItem {
  id: number
  custom_name: string | null
  store_items: {
    name: string
    rank: number
    image_url: string
  }
}

interface ManageApplicationsDialogProps {
  challenge: Challenge
  applications: Application[]
  children: React.ReactNode
  onSuccess?: () => void
}

export function ManageApplicationsDialog({
  challenge,
  applications,
  children,
  onSuccess,
}: ManageApplicationsDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [awardedCount, setAwardedCount] = useState(0)
  const [selectedNFT, setSelectedNFT] = useState<number | null>(null)
  const [awardingTo, setAwardingTo] = useState<Application | null>(null)
  const [showAddNFTPrompt, setShowAddNFTPrompt] = useState(false)

  useEffect(() => {
    if (open) {
      fetchChallengeNFTs()
    }
  }, [open])

  const fetchChallengeNFTs = async () => {
    const supabase = createClient()

    // Get available NFTs
    const { data: available } = await supabase
      .from("organizer_inventory")
      .select("*, store_items(*)")
      .eq("challenge_id", challenge.id)
      .is("awarded_to", null)

    // Get awarded count
    const { count } = await supabase
      .from("organizer_inventory")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challenge.id)
      .not("awarded_to", "is", null)

    if (available) setAvailableNFTs(available)
    if (count !== null) setAwardedCount(count)
  }

  const handleUpdateStatus = async (applicationId: number, status: "approved" | "rejected") => {
    setIsLoading(applicationId)

    const supabase = createClient()

    const { error } = await supabase.from("challenge_applications").update({ status }).eq("id", applicationId)

    setIsLoading(null)

    if (!error) {
      onSuccess?.()
    }
  }

  const handleAwardBadge = async () => {
    if (!user || !awardingTo || !selectedNFT) return

    setIsLoading(awardingTo.id)

    const supabase = createClient()

    // Create award
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .insert({
        challenge_id: challenge.id,
        recipient_wallet: awardingTo.applicant_wallet,
        awarded_by: user.wallet_address,
        notes: `Completed ${challenge.name}`,
        inventory_id: selectedNFT,
      })
      .select()
      .single()

    if (!awardError && award) {
      // Mark NFT as awarded
      await supabase
        .from("organizer_inventory")
        .update({
          awarded_to: awardingTo.applicant_wallet,
          awarded_at: new Date().toISOString(),
        })
        .eq("id", selectedNFT)
    }

    setIsLoading(null)
    setAwardingTo(null)
    setSelectedNFT(null)

    if (!awardError) {
      await fetchChallengeNFTs()

      if (availableNFTs.length === 1) {
        setShowAddNFTPrompt(true)
      }

      onSuccess?.()
    }
  }

  const pending = applications.filter((a) => a.status === "pending")
  const approved = applications.filter((a) => a.status === "approved")
  const rejected = applications.filter((a) => a.status === "rejected")

  const totalNFTs = availableNFTs.length + awardedCount

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Applications - {challenge.name}</DialogTitle>
          <DialogDescription>Review and approve/reject pending applications for this challenge.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Package className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">NFT Badges</p>
            <p className="text-sm text-muted-foreground">
              {awardedCount} of {totalNFTs} awarded • {availableNFTs.length} available
            </p>
          </div>
        </div>

        {showAddNFTPrompt && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All NFTs have been awarded! Would you like to add more NFTs to this challenge or close it?
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddNFTPrompt(false)}>
                  Add More NFTs
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddNFTPrompt(false)}>
                  Close Challenge
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {awardingTo && (
              <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                <h4 className="font-semibold mb-3">Select NFT to Award to {awardingTo.users.display_name}</h4>
                {availableNFTs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No NFTs available to award.</p>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {availableNFTs.map((nft) => {
                      const rank = RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                      return (
                        <button
                          key={nft.id}
                          type="button"
                          onClick={() => setSelectedNFT(nft.id)}
                          className={`p-2 border-2 rounded-lg transition-all hover:scale-105 ${
                            selectedNFT === nft.id ? "border-primary bg-primary/10" : "border-border"
                          }`}
                        >
                          <img
                            src={nft.store_items.image_url || "/placeholder.svg"}
                            alt={nft.store_items.name}
                            className="w-full aspect-square object-cover rounded-md mb-1"
                          />
                          <p className="text-xs font-medium truncate">{nft.custom_name || nft.store_items.name}</p>
                          <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                            {rank.name}
                          </Badge>
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAwardBadge} disabled={!selectedNFT || isLoading === awardingTo.id}>
                    {isLoading === awardingTo.id ? "Awarding..." : "Confirm Award"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAwardingTo(null)
                      setSelectedNFT(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Pending Applications */}
            {pending.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Pending Applications ({pending.length})
                </h3>
                <div className="space-y-3">
                  {pending.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <Link
                        href={`/profile/${application.applicant_wallet}`}
                        className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={application.users.avatar_url || "/placeholder.svg"}
                            alt={application.users.display_name}
                          />
                          <AvatarFallback>{application.users.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{application.users.display_name}</p>
                          <p className="text-sm text-muted-foreground font-mono">{application.applicant_wallet}</p>
                          <p className="text-xs text-muted-foreground">
                            Applied {new Date(application.applied_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(application.id, "approved")}
                          disabled={isLoading === application.id}
                          className="gap-1 bg-transparent"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(application.id, "rejected")}
                          disabled={isLoading === application.id}
                          className="gap-1 bg-transparent"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Applications */}
            {/* Removed approved section */}

            {/* Rejected Applications */}
            {/* Removed rejected section */}

            {pending.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No pending applications for this challenge.</div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
