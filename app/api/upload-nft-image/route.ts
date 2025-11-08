import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const organizerWallet = formData.get("organizerWallet") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!organizerWallet) {
      return NextResponse.json({ error: "Organizer wallet address required" }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("[v0] BLOB_READ_WRITE_TOKEN not configured, skipping NFT image upload")
      return NextResponse.json(
        { error: "Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN environment variable." },
        { status: 503 },
      )
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 },
      )
    }

    // Upload to Vercel Blob
    const blob = await put(`nft-images/${organizerWallet}-${Date.now()}.${file.name.split(".").pop()}`, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] NFT image upload error:", error)
    return NextResponse.json({ error: "Failed to upload NFT image" }, { status: 500 })
  }
}
