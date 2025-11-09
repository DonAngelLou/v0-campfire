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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { Badge } from "@/components/ui/badge"
import { X, Package, Ticket, Calendar } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import type { BlockchainToken } from "@/types/blockchain"

interface CreateEventDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
  organizationId?: string
}

interface InventoryItem {
  id: number
  organizer_wallet: string
  store_item_id: string | null
  custom_name: string | null
  custom_description: string | null
  custom_image_url: string | null
  purchased_at: string
  awarded: boolean
  awarded_to: string | null
  awarded_at: string | null
  challenge_id: number | null
  quantity: number
  awarded_count: number
  blockchain_tokens?: BlockchainToken[] | null
  store_items: {
    id: string
    name: string
    rank: number
    image_url: string
  } | null
}

const getAvailableTokenCount = (item: InventoryItem) => {
  if (Array.isArray(item.blockchain_tokens) && item.blockchain_tokens.length > 0) {
    return item.blockchain_tokens.filter((token) => token.status === "available").length
  }
  return Math.max((item.quantity || 0) - (item.awarded_count || 0), 0)
}

export function CreateEventDialog({ children, onSuccess, organizationId }: CreateEventDialogProps) {
  const { user } = useWalletAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [availableNFTs, setAvailableNFTs] = useState<InventoryItem[]>([])
  const [selectedTicketNFT, setSelectedTicketNFT] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    criteria: "",
    location: "",
    start_date: "",
    end_date: "",
    status: "draft" as "draft" | "open" | "ongoing" | "completed",

    // Ticket configuration
    ticket_enabled: false,
    ticket_price: "0",
    ticket_supply: "",
    ticket_custom_name: "",
    ticket_custom_description: "",

    // Milestone configuration
    milestone_enabled: false,
    milestone_sequential: false,
    milestone_description: "",
  })

  const resolvedWallet = organizationId || user?.sui_wallet_address || user?.wallet_address || null

  useEffect(() => {
    if (open && resolvedWallet) {
      void fetchAvailableNFTs(resolvedWallet)
    } else if (open) {
      setAvailableNFTs([])
      setSelectedTicketNFT(null)
    }
  }, [open, resolvedWallet])

  const fetchAvailableNFTs = async (wallet: string) => {
    try {
      let data: InventoryItem[] = []

      if (organizationId) {
        const response = await fetch(`/api/organizations/${wallet}/inventory`)
        if (!response.ok) {
          throw new Error("Unable to load organization inventory.")
        }
        data = await response.json()
      } else if (user) {
        const supabase = createClient()
        const { data: supabaseData, error } = await supabase
          .from("organizer_inventory")
          .select("*, store_items(*)")
          .eq("organizer_wallet", wallet)
          .order("purchased_at", { ascending: false })

        if (error) {
          throw error
        }
        data = (supabaseData as InventoryItem[]) || []
      }

      const filtered = data.filter((item) => getAvailableTokenCount(item) > 0)
      setAvailableNFTs(filtered)

      if (filtered.length === 0) {
        setSelectedTicketNFT(null)
      } else if (selectedTicketNFT && !filtered.some((nft) => nft.id === selectedTicketNFT)) {
        setSelectedTicketNFT(filtered[0].id)
      }
    } catch (error) {
      console.error("[v0] Error fetching available NFTs:", error)
      setAvailableNFTs([])
      setSelectedTicketNFT(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] ===== FORM SUBMIT TRIGGERED =====")
    console.log("[v0] Current step:", step)
    console.log("[v0] Form data:", formData)

    if (step !== 3) {
      console.log("[v0] ❌ BLOCKING SUBMISSION - Not on final step (step 3)")
      console.log("[v0] Current step is:", step)
      e.stopPropagation()
      return false
    }

    console.log("[v0] ✅ On final step, proceeding with event creation")

    if (!user) {
      console.log("[v0] No user found, cannot create event")
      return
    }

    if (!organizationId) {
      console.error("[v0] No organization selected, cannot create event")
      toast({
        title: "No Organization Selected",
        description: "Please select an organization before creating an event.",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] Starting event creation with data:", formData)
    console.log("[v0] Organization ID:", organizationId)
    setIsLoading(true)

    const supabase = createClient()

    console.log("[v0] Verifying organization exists in database...")
    const { data: orgExists, error: orgCheckError } = await supabase
      .from("organizers")
      .select("wallet_address")
      .eq("wallet_address", organizationId)
      .maybeSingle()

    console.log("[v0] Organization check result:", { orgExists, orgCheckError })

    if (orgCheckError) {
      console.error("[v0] Error checking organization:", orgCheckError)
      toast({
        title: "Error Checking Organization",
        description: "Failed to verify organization. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (!orgExists) {
      console.error("[v0] Organization not found in database:", organizationId)
      console.error("[v0] This organization may not have been properly created. Please create a new organization.")
      toast({
        title: "Organization Not Found",
        description: "This organization was not properly created. Please create a new organization or contact support.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    console.log("[v0] Organization verified successfully, proceeding with event creation")
    console.log("[v0] Inserting event into database...")

    // Create event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        organizer_id: user.wallet_address,
        organization_id: organizationId,
        name: formData.name,
        description: formData.description,
        criteria: formData.criteria,
        location: formData.location,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        ticket_enabled: formData.ticket_enabled,
        ticket_price: formData.ticket_enabled ? Number.parseFloat(formData.ticket_price) : 0,
        ticket_nft_id: formData.ticket_enabled ? selectedTicketNFT : null,
        ticket_supply: formData.ticket_supply ? Number.parseInt(formData.ticket_supply) : null,
        ticket_custom_name: formData.ticket_custom_name || null,
        ticket_custom_description: formData.ticket_custom_description || null,
        milestone_enabled: formData.milestone_enabled,
        milestone_sequential: formData.milestone_sequential,
        milestone_description: formData.milestone_description || null,
      })
      .select()
      .single()

    if (eventError || !event) {
      console.error("[v0] Error creating event:", eventError)
      console.error("[v0] Full error details:", JSON.stringify(eventError, null, 2))
      if (eventError?.code === "23503") {
        console.error("[v0] Foreign key constraint violation - organization may not exist in database")
        toast({
          title: "Organization Error",
          description:
            "The selected organization is invalid. Please select a different organization or create a new one.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error Creating Event",
          description: "Failed to create event. Please try again.",
          variant: "destructive",
        })
      }
      setIsLoading(false)
      return
    }

    console.log("[v0] Event created successfully:", event.id)

    console.log("[v0] Adding creator as admin...")

    // Add creator as admin
    await supabase.from("event_team_members").insert({
      event_id: event.id,
      user_id: user.wallet_address,
      role: "admin",
      added_by: user.wallet_address,
    })

    console.log("[v0] Event creation complete!")

    toast({
      title: "Event Created!",
      description: `${formData.name} has been successfully created.`,
    })

    setIsLoading(false)
    setOpen(false)
    resetForm()
    onSuccess?.()
  }

  const resetForm = () => {
    setStep(1)
    setSelectedTicketNFT(null)
    setFormData({
      name: "",
      description: "",
      criteria: "",
      location: "",
      start_date: "",
      end_date: "",
      status: "draft",
      ticket_enabled: false,
      ticket_price: "0",
      ticket_supply: "",
      ticket_custom_name: "",
      ticket_custom_description: "",
      milestone_enabled: false,
      milestone_sequential: false,
      milestone_description: "",
    })
  }

  const selectedTicketDetails = availableNFTs.find((nft) => nft.id === selectedTicketNFT)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && step !== 3) {
      console.log("[v0] ⚠️ Enter key pressed on step", step, "- preventing default submission")
      e.preventDefault()
      return false
    }
  }

  const handleNextToStep2 = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] 📍 Navigation: Step 1 → Step 2")
    setStep(2)
  }

  const handleNextToStep3 = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] 📍 Navigation: Step 2 → Step 3")
    setStep(3)
  }

  const handleBackToStep1 = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] 📍 Navigation: Step 2 → Step 1")
    setStep(1)
  }

  const handleBackToStep2 = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] 📍 Navigation: Step 3 → Step 2")
    setStep(2)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            {step === 1 && "Set up your event details and dates."}
            {step === 2 && "Configure event tickets for participants."}
            {step === 3 && "Set up milestone challenges (optional)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <div className="space-y-4 pb-4">
              {/* Step 1: Basic Event Info */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hackathon 2025"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this event is about..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="criteria">Participation Criteria</Label>
                    <Textarea
                      id="criteria"
                      value={formData.criteria}
                      onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                      placeholder="What are the requirements to participate?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., San Francisco, CA or Virtual"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="open">Open for Registration</SelectItem>
                        <SelectItem value="ongoing">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Step 2: Ticket Configuration */}
              {step === 2 && (
                <>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5 text-primary" />
                      <div>
                        <Label htmlFor="ticket_enabled" className="text-base font-semibold">
                          Enable Event Tickets
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Require participants to register and receive a ticket NFT
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="ticket_enabled"
                      checked={formData.ticket_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, ticket_enabled: checked })}
                    />
                  </div>

                  {formData.ticket_enabled && (
                    <div className="space-y-4 p-4 border border-border rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="ticket_price">Ticket Price (SUI)</Label>
                        <Input
                          id="ticket_price"
                          type="number"
                          min="0"
                          step="0.001"
                          value={formData.ticket_price}
                          onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                          placeholder="0.000"
                        />
                        <p className="text-xs text-muted-foreground">Set to 0 for free tickets</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket_supply">Ticket Supply (Optional)</Label>
                        <Input
                          id="ticket_supply"
                          type="number"
                          min="1"
                          value={formData.ticket_supply}
                          onChange={(e) => setFormData({ ...formData, ticket_supply: e.target.value })}
                          placeholder="Leave empty for unlimited"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Select Ticket NFT Design</Label>
                        {selectedTicketDetails && (
                          <div className="p-3 border border-primary rounded-lg bg-primary/5 mb-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  selectedTicketDetails.store_items?.image_url ||
                                  selectedTicketDetails.custom_image_url ||
                                  "/placeholder.svg"
                                }
                                alt={
                                  selectedTicketDetails.store_items?.name ||
                                    selectedTicketDetails.custom_name ||
                                    "Selected NFT"
                                }
                                className="w-16 h-16 rounded-md object-cover"
                              />
                              <div className="flex-1">
                                <p className="font-medium">
                                  {selectedTicketDetails.custom_name ||
                                    selectedTicketDetails.store_items?.name ||
                                    "Custom NFT"}
                                </p>
                                {selectedTicketDetails.store_items ? (
                                  <Badge
                                    variant="outline"
                                    style={{
                                      borderColor:
                                        RANK_CONFIG[
                                          selectedTicketDetails.store_items.rank as keyof typeof RANK_CONFIG
                                        ].color,
                                    }}
                                  >
                                    {
                                      RANK_CONFIG[
                                        selectedTicketDetails.store_items.rank as keyof typeof RANK_CONFIG
                                      ].name
                                    }
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Custom Mint</Badge>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  Available supply: {getAvailableTokenCount(selectedTicketDetails)}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedTicketNFT(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {availableNFTs.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No NFTs available in inventory.</p>
                            <p className="text-sm">Purchase or mint NFTs for this organization first.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableNFTs.map((nft) => {
                              const rank = nft.store_items
                                ? RANK_CONFIG[nft.store_items.rank as keyof typeof RANK_CONFIG]
                                : null
                              const isSelected = selectedTicketNFT === nft.id
                              const imageSrc = nft.store_items?.image_url || nft.custom_image_url || "/placeholder.svg"
                              const title = nft.custom_name || nft.store_items?.name || "Custom NFT"
                              const availableCount = getAvailableTokenCount(nft)
                              return (
                                <button
                                  key={nft.id}
                                  type="button"
                                  onClick={() => setSelectedTicketNFT(nft.id)}
                                  className={`p-2 border-2 rounded-lg text-left transition-all hover:scale-105 ${
                                    isSelected
                                      ? "border-primary bg-primary/10"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <img
                                    src={imageSrc}
                                    alt={title}
                                    className="w-full aspect-square object-cover rounded-md mb-2"
                                  />
                                  <p className="font-medium text-xs truncate">
                                    {title}
                                  </p>
                                  {rank ? (
                                    <Badge variant="outline" className="text-xs mt-1" style={{ borderColor: rank.color }}>
                                      {rank.name}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      Custom Mint
                                    </Badge>
                                  )}
                                  <p className="text-[10px] text-muted-foreground mt-1">Available: {availableCount}</p>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket_custom_name">Custom Ticket Name (Optional)</Label>
                        <Input
                          id="ticket_custom_name"
                          value={formData.ticket_custom_name}
                          onChange={(e) => setFormData({ ...formData, ticket_custom_name: e.target.value })}
                          placeholder="e.g., Hackathon 2025 Participant Pass"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket_custom_description">Custom Ticket Description (Optional)</Label>
                        <Textarea
                          id="ticket_custom_description"
                          value={formData.ticket_custom_description}
                          onChange={(e) => setFormData({ ...formData, ticket_custom_description: e.target.value })}
                          placeholder="Describe what this ticket represents..."
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Milestone Configuration */}
              {step === 3 && (
                <>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <Label htmlFor="milestone_enabled" className="text-base font-semibold">
                          Enable Milestone Track
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create a series of challenges with completion rewards
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="milestone_enabled"
                      checked={formData.milestone_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, milestone_enabled: checked })}
                    />
                  </div>

                  {formData.milestone_enabled && (
                    <div className="space-y-4 p-4 border border-border rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="milestone_description">Milestone Track Description</Label>
                        <Textarea
                          id="milestone_description"
                          value={formData.milestone_description}
                          onChange={(e) => setFormData({ ...formData, milestone_description: e.target.value })}
                          placeholder="Describe the milestone challenge series..."
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                        <div>
                          <Label htmlFor="milestone_sequential" className="text-sm font-medium">
                            Sequential Completion
                          </Label>
                          <p className="text-xs text-muted-foreground">Require challenges to be completed in order</p>
                        </div>
                        <Switch
                          id="milestone_sequential"
                          checked={formData.milestone_sequential}
                          onCheckedChange={(checked) => setFormData({ ...formData, milestone_sequential: checked })}
                        />
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          You'll be able to add milestone challenges and set completion thresholds after creating the
                          event.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between pt-4 border-t mt-auto">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleNextToStep2} disabled={!formData.name || !formData.description}>
                  Next: Tickets
                </Button>
              </>
            ) : step === 2 ? (
              <>
                <Button type="button" variant="outline" onClick={handleBackToStep1} disabled={isLoading}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleNextToStep3}
                  disabled={formData.ticket_enabled && !selectedTicketNFT}
                >
                  Next: Milestones
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleBackToStep2} disabled={isLoading}>
                  Back
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Event"}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const RANK_CONFIG = {
  5: { name: "Initiate", color: "#A0AEC0" },
  4: { name: "Adept", color: "#4299E1" },
  3: { name: "Vanguard", color: "#38A169" },
  2: { name: "Luminary", color: "#D69E2E" },
  1: { name: "Paragon", color: "#805AD5" },
}
