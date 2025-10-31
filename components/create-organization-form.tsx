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

  const checkOrgNameUnique = async (name: string): Promise<boolean> => {
    const supabase = createClient()
    const { data, error } = await supabase.from("organizers").select("org_name").ilike("org_name", name).single()

    return !data // Returns true if no organization with this name exists
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLoading) return

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

    setIsLoading(true)
    const isUnique = await checkOrgNameUnique(formData.orgName.trim())
    setIsLoading(false)

    if (!isUnique) {
      toast({
        title: "Name Already Taken",
        description: "An organization with this name already exists. Please choose a different name.",
        variant: "destructive",
      })
      return
    }

    setStep("payment")
  }

  const handlePayment = async () => {
    if (!user) return

    if (isLoading) return

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

      const { error: orgError } = await supabase.from("organizers").insert({
        wallet_address: orgWallet,
        org_name: formData.orgName,
        org_description: formData.orgDescription,
        verified: false,
      })

      if (orgError) throw orgError

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
        description: `${formData.orgName} has been successfully created. Redirecting to dashboard...`,
      })

      // Wait 2 seconds to show the success message, then refresh
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Error creating organization:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      })
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <div className="bg-muted p-6 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Creation Fee:</p>
                <p className="text-3xl font-bold">₱2,500.00</p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Checking availability..." : "Continue to Payment"}
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
