"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { CheckIcon, XIcon, Loader2 } from "lucide-react"

interface PendingInfluence {
  id: number
  influencer_wallet: string
  influenced_wallet: string
  award_id: number
  status: string
  influenced_user: {
    wallet_address: string
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
  const { user } = useAuth()
  const [pendingInfluences, setPendingInfluences] = useState<PendingInfluence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      fetchPendingInfluences()
    }
  }, [user])

  const fetchPendingInfluences = async () => {
    if (!user) return

    const supabase = createClient()

    const { data } = await supabase
      .from("influences")
      .select(
        `
        *,
        influenced_user:users!influences_influenced_wallet_fkey(wallet_address, display_name, avatar_url),
        award:awards(id, challenges(name, image_url))
      `,
      )
      .eq("influencer_wallet", user.wallet_address)
      .eq("status", "pending")

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
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </CardContent>
      </Card>
    )
  }

  if (pendingInfluences.length === 0) {
    return null
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Pending Influence Requests</CardTitle>
        <CardDescription>Users who want to tag you as their influencer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingInfluences.map((influence) => (
          <div
            key={influence.id}
            className="flex items-center gap-4 p-4 border rounded-lg transition-all duration-200 hover:border-primary"
          >
            <Link href={`/profile/${influence.influenced_user.wallet_address}`}>
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
                <Link
                  href={`/profile/${influence.influenced_user.wallet_address}`}
                  className="font-semibold hover:underline"
                >
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
        ))}
      </CardContent>
    </Card>
  )
}
