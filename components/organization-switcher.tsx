"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Organization {
  wallet_address: string
  org_name: string
  org_logo_url?: string
  verified?: boolean
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  selectedOrg: Organization
  onSelect?: (org: Organization) => void
}

export function OrganizationSwitcher({ organizations, selectedOrg, onSelect }: OrganizationSwitcherProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (org: Organization) => {
    if (onSelect) {
      onSelect(org)
    }
    setOpen(false)
  }

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
        <Avatar className="h-6 w-6">
          <AvatarImage src={selectedOrg.org_logo_url || "/placeholder.svg"} alt={selectedOrg.org_name} />
          <AvatarFallback className="text-xs">{selectedOrg.org_name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{selectedOrg.org_name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Avatar className="h-6 w-6">
            <AvatarImage src={selectedOrg.org_logo_url || "/placeholder.svg"} alt={selectedOrg.org_name} />
            <AvatarFallback className="text-xs">{selectedOrg.org_name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{selectedOrg.org_name}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.wallet_address}
            onClick={() => handleSelect(org)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={org.org_logo_url || "/placeholder.svg"} alt={org.org_name} />
              <AvatarFallback className="text-xs">{org.org_name[0]}</AvatarFallback>
            </Avatar>
            <span className="flex-1">{org.org_name}</span>
            {org.wallet_address === selectedOrg.wallet_address && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
