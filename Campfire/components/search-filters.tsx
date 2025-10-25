"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface SearchFiltersProps {
  organizers: Array<{
    wallet_address: string
    org_name: string
  }>
  currentSearch: string
  currentOrganizer: string
}

export function SearchFilters({ organizers, currentSearch, currentOrganizer }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(currentSearch)
  const [organizer, setOrganizer] = useState(currentOrganizer)

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())

    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }

    if (organizer) {
      params.set("organizer", organizer)
    } else {
      params.delete("organizer")
    }

    startTransition(() => {
      router.push(`/browse?${params.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch("")
    setOrganizer("")
    startTransition(() => {
      router.push("/browse")
    })
  }

  const hasFilters = search || organizer

  return (
    <div className="mb-8 space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search badges by name, description, or criteria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch()
              }
            }}
            className="w-full"
          />
        </div>
        <Select value={organizer} onValueChange={setOrganizer}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Organizers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizers</SelectItem>
            {organizers.map((org) => (
              <SelectItem key={org.wallet_address} value={org.wallet_address}>
                {org.org_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {hasFilters && (
          <Button variant="outline" onClick={handleClear} disabled={isPending}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
