"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface EditOrganizationDialogProps {
  organization: {
    wallet_address: string
    name: string
    description: string | null
    logo_url: string | null
  }
  onSuccess?: () => void
}

export function EditOrganizationDialog({ organization, onSuccess }: EditOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState(organization.name)
  const [description, setDescription] = useState(organization.description || "")
  const [logoUrl, setLogoUrl] = useState(organization.logo_url || "")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile) return logoUrl

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", logoFile)
      formData.append("orgWallet", organization.wallet_address)

      const response = await fetch("/api/upload-org-logo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload logo")
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload organization logo",
        variant: "destructive",
      })
      return logoUrl
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Check if name is being changed and if it's unique
      if (name !== organization.name) {
        const { data: existingOrg } = await supabase
          .from("organizers")
          .select("wallet_address")
          .eq("name", name)
          .single()

        if (existingOrg) {
          toast({
            title: "Name already taken",
            description: "An organization with this name already exists. Please choose a different name.",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
      }

      // Upload logo if changed
      let finalLogoUrl = logoUrl
      if (logoFile) {
        finalLogoUrl = await uploadLogo()
      }

      // Update organization
      const { error } = await supabase
        .from("organizers")
        .update({
          name,
          description,
          logo_url: finalLogoUrl,
        })
        .eq("wallet_address", organization.wallet_address)

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Organization profile has been updated successfully.",
      })

      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error updating organization:", error)
      toast({
        title: "Update failed",
        description: "Failed to update organization profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Organization Profile</DialogTitle>
          <DialogDescription>Update your organization's logo, name, and description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo">Organization Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                {previewUrl || logoUrl ? (
                  <Image src={previewUrl || logoUrl} alt="Organization logo" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No logo</div>
                )}
              </div>
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={loading || uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG or GIF (max. 5MB)</p>
              </div>
            </div>
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              required
              disabled={loading || uploading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your organization..."
              rows={4}
              disabled={loading || uploading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
