"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Building2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CreateOrganizationDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
}

export function CreateOrganizationDialog({ children, onSuccess }: CreateOrganizationDialogProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"form" | "payment">("form")
  const [formData, setFormData] = useState({
    orgName: "",
    orgDescription: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setStep("payment")
  }

  const handlePayment = async () => {
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate unique wallet address for organization
      const orgWallet = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`

      const { error: userError } = await supabase.from("users").insert({
        wallet_address: orgWallet,
        display_name: formData.orgName,
        bio: formData.orgDescription,
        role: "organizer",
      })

      if (userError) throw userError

      // Create organization record
      const { error: orgError } = await supabase.from("organizers").insert({
        wallet_address: orgWallet,
        org_name: formData.orgName,
        org_description: formData.orgDescription,
        verified: false,
      })

      if (orgError) throw orgError

      // Add creator as owner
      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_wallet: orgWallet,
        user_wallet: user.wallet_address,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      })

      if (memberError) throw memberError

      toast({
        title: "Organization Created!",
        description: `${formData.orgName} has been successfully created.`,
      })

      setOpen(false)
      setStep("form")
      setFormData({ orgName: "", orgDescription: "" })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("[v0] Error creating organization:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {step === "form" ? "Create Organization" : "Payment"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Create your own organization to award badges and manage challenges."
              : "Complete payment to create your organization."}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                value={formData.orgName}
                onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                placeholder="Enter organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgDescription">Description *</Label>
              <Textarea
                id="orgDescription"
                value={formData.orgDescription}
                onChange={(e) => setFormData({ ...formData, orgDescription: e.target.value })}
                placeholder="Describe your organization"
                rows={4}
                required
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Creation Fee:</p>
              <p className="text-2xl font-bold">₱2,500.00</p>
            </div>

            <Button type="submit" className="w-full">
              Continue to Payment
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-semibold mb-2">Payment Amount</p>
              <p className="text-3xl font-bold mb-4">₱2,500.00</p>
              <p className="text-sm text-muted-foreground">This is a simulated payment. Click confirm to proceed.</p>
            </div>

            <div className="space-y-2">
              <Button onClick={handlePayment} disabled={isLoading} className="w-full">
                {isLoading ? "Processing..." : "Confirm Payment"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isLoading}
                className="w-full"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
