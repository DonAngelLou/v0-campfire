"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Application {
  id: number
  applicant_wallet: string
  status: "pending" | "approved" | "rejected"
  applied_at: string
  challenge_id: number
  users: {
    wallet_address: string
    display_name: string
    avatar_url: string | null
  }
  challenges: {
    id: number
    name: string
  }
}

interface ManageAllApplicationsDialogProps {
  organizerWallet: string
  children: React.ReactNode
}

export function ManageAllApplicationsDialog({ organizerWallet, children }: ManageAllApplicationsDialogProps) {
  const [open, setOpen] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState<number | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (open) {
      fetchApplications()
    }
  }, [open, organizerWallet])

  const fetchApplications = async () => {
    setIsLoadingData(true)
    const supabase = createClient()

    // Get all challenges for this organizer
    const { data: challenges } = await supabase.from("challenges").select("id").eq("created_by", organizerWallet)

    if (!challenges || challenges.length === 0) {
      setApplications([])
      setIsLoadingData(false)
      return
    }

    const challengeIds = challenges.map((c) => c.id)

    // Get all applications for these challenges
    const { data: applicationsData } = await supabase
      .from("challenge_applications")
      .select(`
        *,
        users (
          wallet_address,
          display_name,
          avatar_url
        ),
        challenges (
          id,
          name
        )
      `)
      .in("challenge_id", challengeIds)
      .order("applied_at", { ascending: false })

    setApplications(applicationsData || [])
    setIsLoadingData(false)
  }

  const handleUpdateStatus = async (applicationId: number, status: "approved" | "rejected") => {
    setIsLoading(applicationId)

    const supabase = createClient()
    const { error } = await supabase.from("challenge_applications").update({ status }).eq("id", applicationId)

    setIsLoading(null)

    if (!error) {
      await fetchApplications()
    }
  }

  const pending = applications.filter((a) => a.status === "pending")
  const approved = applications.filter((a) => a.status === "approved")
  const rejected = applications.filter((a) => a.status === "rejected")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage All Applications</DialogTitle>
          <DialogDescription>Review and manage applications across all your challenges.</DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="flex-1">
              <ScrollArea className="h-[500px] pr-4">
                {pending.length > 0 ? (
                  <div className="space-y-3">
                    {pending.map((application) => (
                      <div
                        key={application.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div className="flex-1">
                          <Link
                            href={`/profile/${application.applicant_wallet}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity mb-2"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={application.users.avatar_url || "/placeholder.svg"}
                                alt={application.users.display_name}
                              />
                              <AvatarFallback>{application.users.display_name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{application.users.display_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Applied {new Date(application.applied_at).toLocaleDateString()}
                              </p>
                            </div>
                          </Link>
                          <Badge variant="outline" className="text-xs">
                            {application.challenges.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(application.id, "approved")}
                            disabled={isLoading === application.id}
                            className="gap-1 bg-transparent"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(application.id, "rejected")}
                            disabled={isLoading === application.id}
                            className="gap-1 bg-transparent"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending applications</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="approved" className="flex-1">
              <ScrollArea className="h-[500px] pr-4">
                {approved.length > 0 ? (
                  <div className="space-y-3">
                    {approved.map((application) => (
                      <div key={application.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                        <Link
                          href={`/profile/${application.applicant_wallet}`}
                          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.users.avatar_url || "/placeholder.svg"}
                              alt={application.users.display_name}
                            />
                            <AvatarFallback>{application.users.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{application.users.display_name}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {application.challenges.name}
                            </Badge>
                          </div>
                        </Link>
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Approved
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No approved applications</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="rejected" className="flex-1">
              <ScrollArea className="h-[500px] pr-4">
                {rejected.length > 0 ? (
                  <div className="space-y-3">
                    {rejected.map((application) => (
                      <div key={application.id} className="flex items-center gap-3 p-4 border border-border rounded-lg">
                        <Link
                          href={`/profile/${application.applicant_wallet}`}
                          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={application.users.avatar_url || "/placeholder.svg"}
                              alt={application.users.display_name}
                            />
                            <AvatarFallback>{application.users.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{application.users.display_name}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {application.challenges.name}
                            </Badge>
                          </div>
                        </Link>
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Rejected
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No rejected applications</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
