"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"

interface Organization {
  wallet_address: string
  org_name: string
  role: string
}

interface OrganizationSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function OrganizationSelector({ value, onChange }: OrganizationSelectorProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchOrganizations()
    }
  }, [user])

  const fetchOrganizations = async () => {
    if (!user) return

    const supabase = createClient()

    // Fetch organizations where user is owner or admin
    const { data } = await supabase
      .from("organization_members")
      .select(`
        organization_wallet,
        role,
        organizers(wallet_address, org_name)
      `)
      .eq("user_wallet", user.wallet_address)
      .eq("status", "active")

    const orgs = (data || []).map((item: any) => ({
      wallet_address: item.organizers.wallet_address,
      org_name: item.organizers.org_name,
      role: item.role,
    }))

    setOrganizations(orgs)

    // Set first organization as default if none selected
    if (orgs.length > 0 && !value) {
      onChange(orgs[0].wallet_address)
    }

    setIsLoading(false)
  }

  const selectedOrg = organizations.find((org) => org.wallet_address === value)

  if (isLoading) {
    return <div className="w-[280px] h-10 bg-muted animate-pulse rounded-md" />
  }

  if (organizations.length === 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between bg-transparent"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {selectedOrg ? selectedOrg.org_name : "Select organization..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search organization..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {organizations.map((org) => (
                <CommandItem
                  key={org.wallet_address}
                  value={org.wallet_address}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === org.wallet_address ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1">
                    <div className="font-medium">{org.org_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{org.role}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
