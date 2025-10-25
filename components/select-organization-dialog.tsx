"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { BuildingIcon, ExternalLinkIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface Organization {
  wallet_address: string
  org_name: string
  description: string | null
  logo_url: string | null
  role: string
}

interface SelectOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userWallet: string
}

export function SelectOrganizationDialog({ open, onOpenChange, userWallet }: SelectOrganizationDialogProps) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchOrganizations()
    }
  }, [open, userWallet])

  const fetchOrganizations = async () => {
    setIsLoading(true)
    const supabase = createClient()

    console.log("[v0] Fetching organizations for user:", userWallet)

    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        role,
        organization_wallet,
        organizers!inner(
          wallet_address,
          org_name,
          org_description,
          org_logo_url
        )
      `)
      .eq("user_wallet", userWallet)
      .eq("status", "active")

    if (error) {
      console.error("[v0] Error fetching organizations:", error)
      setIsLoading(false)
      return
    }

    console.log("[v0] Organizations data:", data)

    const orgs: Organization[] = (data || []).map((item: any) => ({
      wallet_address: item.organizers.wallet_address,
      org_name: item.organizers.org_name,
      description: item.organizers.org_description,
      logo_url: item.organizers.org_logo_url,
      role: item.role,
    }))

    setOrganizations(orgs)
    setIsLoading(false)
  }

  const handleSelectOrganization = (orgWallet: string) => {
    console.log("[v0] Selected organization:", orgWallet)
    router.push(`/org/${orgWallet}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BuildingIcon className="w-5 h-5" />
            Select Organization
          </DialogTitle>
          <DialogDescription>Choose which organization you want to view</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12">
            <BuildingIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No organizations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <Card
                key={org.wallet_address}
                className="cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                onClick={() => handleSelectOrganization(org.wallet_address)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {org.logo_url ? (
                        <img
                          src={org.logo_url || "/placeholder.svg"}
                          alt={org.org_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <BuildingIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{org.org_name}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                          {org.role}
                        </span>
                      </div>
                      {org.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{org.description}</p>
                      )}
                    </div>
                    <ExternalLinkIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
