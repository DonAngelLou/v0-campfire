import { put } from "@vercel/blob"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Blob storage is not configured (BLOB_READ_WRITE_TOKEN missing)." },
        { status: 503 },
      )
    }

    const body = await request.json()
    const { metadata, organizerWallet, storeItemId } = body

    if (!metadata || typeof metadata !== "object") {
      return NextResponse.json({ error: "Metadata payload is required." }, { status: 400 })
    }

    const walletSegment = (organizerWallet || "global").replace(/[^a-zA-Z0-9_-]/g, "")
    const storeSegment = (storeItemId || "custom").replace(/[^a-zA-Z0-9_-]/g, "")
    const pathname = `metadata/${walletSegment}/${storeSegment}-${Date.now()}.json`

    const blob = await put(pathname, JSON.stringify(metadata, null, 2), {
      access: "public",
      contentType: "application/json",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] Metadata upload error:", error)
    return NextResponse.json({ error: "Failed to create metadata file." }, { status: 500 })
  }
}
