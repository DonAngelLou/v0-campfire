"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { CheckIcon, XIcon, Loader2 } from "lucide-react"

interface PendingInfluence {
  id: number
  influencer_wallet: string
  influenced_wallet: string
  award_id: number
  status: string
  influenced_user: {
    wallet_address: string
    sui_wallet_address: string | null
    display_name: string
    avatar_url: string | null
  }
  award: {
    id: number
    challenges: {
      name: string
      image_url: string | null
    }
  }
}

export function PendingInfluences() {
  const { user } = useWalletAuth()
  const [pendingInfluences, setPendingInfluences] = useState<PendingInfluence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    console.log("[v0] PendingInfluences - user:", user)
    if (user) {
      fetchPendingInfluences()
    } else {
      console.log("[v0] PendingInfluences - no user, setting loading to false")
      setIsLoading(false)
    }
  }, [user])

  const fetchPendingInfluences = async () => {
    if (!user) {
      console.log("[v0] PendingInfluences - fetchPendingInfluences called without user")
      setIsLoading(false)
      return
    }

    console.log("[v0] PendingInfluences - fetching for user:", user.display_name)
    const supabase = createClient()

    const userWallet = user.sui_wallet_address || user.wallet_address

    const { data, error } = await supabase
      .from("influences")
      .select(
        `
        *,
        influenced_user:users!influences_influenced_wallet_fkey(wallet_address, sui_wallet_address, display_name, avatar_url),
        award:awards(id, challenges(name, image_url))
      `,
      )
      .eq("influencer_wallet", userWallet)
      .eq("status", "pending")

    console.log("[v0] PendingInfluences - fetched data:", { count: data?.length, error })

    setPendingInfluences(data || [])
    setIsLoading(false)
  }

  const handleApprove = async (influenceId: number) => {
    setProcessingId(influenceId)
    const supabase = createClient()

    await supabase.from("influences").update({ status: "approved" }).eq("id", influenceId)

    setPendingInfluences(pendingInfluences.filter((inf) => inf.id !== influenceId))
    setProcessingId(null)
  }

  const handleReject = async (influenceId: number) => {
    setProcessingId(influenceId)
    const supabase = createClient()

    await supabase.from("influences").update({ status: "rejected" }).eq("id", influenceId)

    setPendingInfluences(pendingInfluences.filter((inf) => inf.id !== influenceId))
    setProcessingId(null)
  }

  if (isLoading) {
    console.log("[v0] PendingInfluences - rendering loading state")
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (pendingInfluences.length === 0) {
    console.log("[v0] PendingInfluences - no pending influences, returning null")
    return null
  }

  console.log("[v0] PendingInfluences - rendering", pendingInfluences.length, "pending influences")

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Pending Influence Requests</CardTitle>
        <CardDescription>Users who want to tag you as their influencer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingInfluences.map((influence) => {
          const profileWallet = influence.influenced_user.sui_wallet_address || influence.influenced_user.wallet_address

          return (
            <div
              key={influence.id}
              className="flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 hover:border-primary"
            >
              <Link href={`/profile/${profileWallet}`}>
                <Avatar className="h-12 w-12 transition-transform duration-300 hover:scale-110">
                  <AvatarImage
                    src={influence.influenced_user.avatar_url || "/placeholder.svg"}
                    alt={influence.influenced_user.display_name}
                  />
                  <AvatarFallback>{influence.influenced_user.display_name[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <Link href={`/profile/${profileWallet}`} className="font-semibold hover:underline">
                    {influence.influenced_user.display_name}
                  </Link>{" "}
                  wants to tag you as their influencer for
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                    <img
                      src={
                        influence.award.challenges.image_url ||
                        `/placeholder.svg?height=32&width=32&query=${encodeURIComponent(influence.award.challenges.name + " badge") || "/placeholder.svg"}`
                      }
                      alt={influence.award.challenges.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {influence.award.challenges.name}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(influence.id)}
                  disabled={processingId === influence.id}
                >
                  {processingId === influence.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckIcon className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(influence.id)}
                  disabled={processingId === influence.id}
                >
                  {processingId === influence.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
