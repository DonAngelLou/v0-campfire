"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { Building2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function CreateOrganizationForm() {
  const { user } = useWalletAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"form" | "payment">("form")
  const [formData, setFormData] = useState({
    orgName: "",
    orgDescription: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please connect your wallet to create an organization.",
        variant: "destructive",
      })
      return
    }

    if (!formData.orgName.trim() || !formData.orgDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setStep("payment")
  }

  const handlePayment = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      console.log("[v0] Starting organization creation for user:", user.wallet_address)

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate unique wallet address for organization
      const orgWallet = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`

      console.log("[v0] Creating organization with wallet:", orgWallet)

      const { error: userError } = await supabase.from("users").insert({
        wallet_address: orgWallet,
        display_name: formData.orgName,
        bio: formData.orgDescription,
        role: "organizer",
      })

      if (userError) {
        console.error("[v0] Error creating user record:", userError)
        throw userError
      }

      const { error: orgError } = await supabase.from("organizers").insert({
        wallet_address: orgWallet,
        org_name: formData.orgName,
        org_description: formData.orgDescription,
        verified: false,
      })

      if (orgError) {
        console.error("[v0] Error creating organizer record:", orgError)
        throw orgError
      }

      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_wallet: orgWallet,
        user_wallet: user.wallet_address,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      })

      if (memberError) {
        console.error("[v0] Error adding member:", memberError)
        throw memberError
      }

      console.log("[v0] Organization created successfully")

      toast({
        title: "Organization Created!",
        description: `${formData.orgName} has been successfully created.`,
      })

      // Refresh the page to show the organization dashboard
      router.refresh()
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building2 className="w-6 h-6" />
            {step === "form" ? "Create Your Organization" : "Payment"}
          </CardTitle>
          <CardDescription>
            {step === "form"
              ? "Create your own organization to award badges and manage challenges."
              : "Complete payment to create your organization."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="bg-muted p-6 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Creation Fee:</p>
                <p className="text-3xl font-bold">₱2,500.00</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                Continue to Payment
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted p-8 rounded-lg text-center">
                <CreditCard className="w-16 h-16 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold mb-2">Payment Amount</p>
                <p className="text-4xl font-bold mb-4">₱2,500.00</p>
                <p className="text-sm text-muted-foreground">This is a simulated payment. Click confirm to proceed.</p>
              </div>

              <div className="space-y-3">
                <Button onClick={handlePayment} disabled={isLoading} className="w-full" size="lg">
                  {isLoading ? "Processing..." : "Confirm Payment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
