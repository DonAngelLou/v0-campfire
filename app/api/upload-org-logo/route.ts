import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const orgWallet = formData.get("orgWallet") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!orgWallet) {
      return NextResponse.json({ error: "No organization wallet provided" }, { status: 400 })
    }

    // Upload to Vercel Blob with organization-specific path
    const blob = await put(`org-logos/${orgWallet}-${Date.now()}.${file.name.split(".").pop()}`, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Error uploading organization logo:", error)
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 })
  }
}
