import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const walletAddress = formData.get("walletAddress") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("[v0] BLOB_READ_WRITE_TOKEN not configured, skipping avatar upload")
      return NextResponse.json(
        { error: "Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN environment variable." },
        { status: 503 },
      )
    }

    // Upload to Vercel Blob
    const blob = await put(`avatars/${walletAddress}-${Date.now()}.${file.name.split(".").pop()}`, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Avatar upload error:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
