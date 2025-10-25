"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Edit2, Save, X, Upload, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { put } from "@vercel/blob"

interface EditOrgInlineProps {
  wallet: string
  orgName: string
  orgBio: string | null
  orgLogoUrl: string | null
  onUpdate: () => void
}

export function EditOrgInline({ wallet, orgName, orgBio, orgLogoUrl, onUpdate }: EditOrgInlineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(orgName)
  const [bio, setBio] = useState(orgBio || "")
  const [logo, setLogo] = useState(orgLogoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const blob = await put(file.name, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      setLogo(blob.url)
    } catch (error) {
      console.error("[v0] Error uploading logo:", error)
      alert("Failed to upload logo. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("organizers")
      .update({
        org_name: name,
        org_description: bio,
        org_logo_url: logo,
      })
      .eq("wallet_address", wallet)

    if (error) {
      console.error("[v0] Error updating organization:", error)
      alert("Failed to update organization. Please try again.")
    } else {
      setIsEditing(false)
      onUpdate()
    }

    setIsSaving(false)
  }

  const handleCancel = () => {
    setName(orgName)
    setBio(orgBio || "")
    setLogo(orgLogoUrl)
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
        Edit Organization
      </Button>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={logo || "/placeholder.svg"} alt={name} />
            <AvatarFallback>
              <Building2 className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="logo-upload"
            className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer hover:scale-110 transition-transform"
          >
            <Upload className="w-3 h-3" />
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={isUploading}
            />
          </label>
        </div>
        <div className="flex-1 space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organization Name"
            disabled={isSaving}
          />
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
