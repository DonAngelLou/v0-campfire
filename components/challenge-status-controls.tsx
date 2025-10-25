"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Settings, XCircle, CheckCircle, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface Challenge {
  id: number
  status: "open" | "closed" | "completed"
}

interface ChallengeStatusControlsProps {
  challenge: Challenge
  onSuccess?: () => void
}

export function ChallengeStatusControls({ challenge, onSuccess }: ChallengeStatusControlsProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [newStatus, setNewStatus] = useState<"open" | "closed" | "completed" | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async () => {
    if (!newStatus) return

    setIsUpdating(true)

    const supabase = createClient()

    // If changing to cancelled, also cancel all pending applications
    if (newStatus === "closed") {
      await supabase
        .from("challenge_applications")
        .update({ status: "rejected" })
        .eq("challenge_id", challenge.id)
        .eq("status", "pending")
    }

    const { error } = await supabase.from("challenges").update({ status: newStatus }).eq("id", challenge.id)

    setIsUpdating(false)
    setShowConfirm(false)
    setNewStatus(null)

    if (!error) {
      onSuccess?.()
    }
  }

  const confirmStatusChange = (status: "open" | "closed" | "completed") => {
    setNewStatus(status)
    setShowConfirm(true)
  }

  const isCompleted = challenge.status === "completed"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled={isCompleted}>
            <Settings className="w-4 h-4" />
            Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {challenge.status !== "open" && !isCompleted && (
            <DropdownMenuItem onClick={() => confirmStatusChange("open")}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Set to Open
            </DropdownMenuItem>
          )}
          {challenge.status !== "closed" && !isCompleted && (
            <DropdownMenuItem onClick={() => confirmStatusChange("closed")}>
              <XCircle className="w-4 h-4 mr-2" />
              Set to Cancelled
            </DropdownMenuItem>
          )}
          {!isCompleted && (
            <DropdownMenuItem onClick={() => confirmStatusChange("completed")}>
              <Lock className="w-4 h-4 mr-2" />
              Mark as Completed
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {newStatus === "open" && "This will reopen the challenge for new applications."}
              {newStatus === "closed" && "This will cancel the challenge and reject all pending applications."}
              {newStatus === "completed" &&
                "This will permanently mark the challenge as completed. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
