"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Edit2, Save, X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface EditProfileInlineProps {
  wallet: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  onUpdate: () => void
}

export function EditProfileInline({ wallet, displayName, bio, avatarUrl, onUpdate }: EditProfileInlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(displayName)
  const [userBio, setUserBio] = useState(bio || "")
  const [avatar, setAvatar] = useState(avatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("walletAddress", wallet)

      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      setAvatar(data.url)
    } catch (error) {
      console.error("[v0] Error uploading avatar:", error)
      alert("Failed to upload avatar. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("users")
      .update({
        display_name: name,
        bio: userBio,
        avatar_url: avatar,
      })
      .eq("wallet_address", wallet)

    if (error) {
      console.error("[v0] Error updating profile:", error)
      alert("Failed to update profile. Please try again.")
    } else {
      setIsEditing(false)
      onUpdate()
    }

    setIsSaving(false)
  }

  const handleCancel = () => {
    setName(displayName)
    setUserBio(bio || "")
    setAvatar(avatarUrl)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <Button
        onClick={() => setIsEditing(true)}
        variant="outline"
        size="sm"
        className="gap-2 transition-all duration-300 hover:scale-105"
      >
        <Edit2 className="w-4 h-4" />
        Edit Profile
      </Button>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatar || "/placeholder.svg"} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:scale-110 transition-transform"
          >
            <Upload className="w-3 h-3" />
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
          </label>
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display Name"
            disabled={isSaving}
          />
          <Textarea
            value={userBio}
            onChange={(e) => setUserBio(e.target.value)}
            placeholder="Bio"
            rows={3}
            disabled={isSaving}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} size="sm" className="gap-2" disabled={isSaving || isUploading}>
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleCancel} variant="outline" size="sm" className="gap-2 bg-transparent" disabled={isSaving}>
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
