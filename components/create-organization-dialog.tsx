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
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { Building2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { buildTreasuryPaymentTransaction, SUI_DECIMALS, useBlockchainTransaction } from "@/lib/sui-blockchain"

interface CreateOrganizationDialogProps {
  children: React.ReactNode
  onSuccess?: () => void
}

const ORG_CREATION_FEE_SUI = Number(process.env.NEXT_PUBLIC_ORG_CREATION_FEE_SUI ?? "1")

export function CreateOrganizationDialog({ children, onSuccess }: CreateOrganizationDialogProps) {
  const { user } = useWalletAuth()
  const currentAccount = useCurrentAccount()
  const { executeTransaction } = useBlockchainTransaction()
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
    if (!user) {
      toast({
        title: "Organization Created!",
        description: `${formData.orgName} has been created. Tx: ${digest.slice(0, 10)}…`,
      })

      setOpen(false)
      setStep("form")
      setFormData({ orgName: "", orgDescription: "" })
      if (typeof window !== "undefined") {
        window.localStorage.setItem("campfire_active_org", orgWallet)
      }
      if (onSuccess) {
        onSuccess()
      }
      router.push(`/organizer/${orgWallet}`)
      router.refresh()    } catch (error: any) {
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
              <p className="text-2xl font-bold">{ORG_CREATION_FEE_SUI} SUI</p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              Continue to Payment
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-6 rounded-lg text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-lg font-semibold mb-2">Payment Amount</p>
              <p className="text-3xl font-bold mb-4">{ORG_CREATION_FEE_SUI} SUI</p>
              <p className="text-sm text-muted-foreground">
                Approve the transaction in your wallet to finalize organization creation.
              </p>
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
