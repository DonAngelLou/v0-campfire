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
import { useCurrentAccount } from "@mysten/dapp-kit"
import { buildTreasuryPaymentTransaction, SUI_DECIMALS, useBlockchainTransaction } from "@/lib/sui-blockchain"

interface CreateOrganizationFormProps {
  onSuccess?: () => void
}

const ORG_CREATION_FEE_SUI = Number(process.env.NEXT_PUBLIC_ORG_CREATION_FEE_SUI ?? "1")

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const { user } = useWalletAuth()
  const currentAccount = useCurrentAccount()
  const { executeTransaction } = useBlockchainTransaction()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [step, setStep] = useState<"form" | "payment">("form")
  const [formData, setFormData] = useState({
    orgName: "",
    orgDescription: "",
  })

  const checkOrgNameUnique = async (name: string): Promise<boolean> => {
    const supabase = createClient()
    const { data, error } = await supabase.from("organizers").select("org_name").eq("org_name", name.toLowerCase())

    console.log("[v0] Checking org name uniqueness:", { name, data, error })

    return !data || data.length === 0
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
    if (!user || !currentAccount) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Slush wallet to pay the creation fee.",
        variant: "destructive",
      })
      return
    }

    if (isLoading) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      console.log("[v0] Starting organization creation for user:", user.wallet_address)

      const paymentTx = buildTreasuryPaymentTransaction(ORG_CREATION_FEE_SUI * SUI_DECIMALS)
      const { digest, success } = await executeTransaction(paymentTx)

      if (!success) {
        throw new Error("Blockchain payment failed. Please try again.")
      }

      // Generate unique wallet address for organization
      const orgWallet = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`
      console.log("[v0] Generated org wallet:", orgWallet)

      console.log("[v0] Inserting user entry for org...")
      const { error: userError } = await supabase.from("users").insert({
        wallet_address: orgWallet,
        display_name: formData.orgName,
        bio: formData.orgDescription,
        role: "organizer",
      })

      if (userError) {
        console.error("[v0] Error creating user:", userError)
        throw userError
      }
      console.log("[v0] User entry created successfully")

      console.log("[v0] Inserting organizer entry...")
      const { error: orgError } = await supabase.from("organizers").insert({
        wallet_address: orgWallet,
        org_name: formData.orgName,
        org_description: formData.orgDescription,
        verified: false,
        created_by: user.wallet_address,
      })

      if (orgError) {
        console.error("[v0] Error creating organizer:", orgError)
        throw orgError
      }
      console.log("[v0] Organizer entry created successfully")

      console.log("[v0] Inserting organization member...")
      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_wallet: orgWallet,
        user_wallet: user.wallet_address,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      })

      if (memberError) {
        console.error("[v0] Error adding organization member:", memberError)
        throw memberError
      }
      console.log("[v0] Organization member added successfully")

      console.log("[v0] Organization created successfully! Redirecting to dashboard...")

      setIsLoading(false)
      setIsRedirecting(true)

      toast({
        title: "Organization Created!",
        description: `${formData.orgName} has been successfully created on-chain.`,
      })

      router.push("/dashboard")
    } catch (error: any) {
      console.error("[v0] Error creating organization:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      })
      setIsLoading(false)
      setIsRedirecting(false)
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
                <p className="text-3xl font-bold">{ORG_CREATION_FEE_SUI} SUI</p>
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
                <p className="text-4xl font-bold mb-4">{ORG_CREATION_FEE_SUI} SUI</p>
                <p className="text-sm text-muted-foreground">
                  Approve the transaction in your wallet to finalize organization creation.
                </p>
              </div>

              <div className="space-y-3">
                <Button onClick={handlePayment} disabled={isLoading || isRedirecting} className="w-full" size="lg">
                  {isRedirecting ? "Redirecting to dashboard..." : isLoading ? "Processing..." : "Confirm Payment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("form")}
                  disabled={isLoading || isRedirecting}
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
