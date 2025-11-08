import { randomUUID } from "node:crypto"

import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB cap to prevent dev server OOM
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"])
const EXTENSION_MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
}

function getExtension(filename?: string | null) {
  if (!filename || !filename.includes(".")) {
    return null
  }
  return filename.split(".").pop()?.toLowerCase() ?? null
}

function normalizeWalletIdentifier(wallet?: string | null) {
  if (!wallet) {
    return "global"
  }
  return wallet.replace(/[^a-zA-Z0-9_-]/g, "") || "global"
}

function resolveMimeType(file: File) {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type
  }
  const ext = getExtension(file.name)
  if (ext && EXTENSION_MIME_MAP[ext]) {
    return EXTENSION_MIME_MAP[ext]
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const contentLengthHeader = request.headers.get("content-length")
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader)
      if (!Number.isNaN(contentLength) && contentLength > MAX_FILE_SIZE_BYTES + 10_000) {
        return NextResponse.json(
          { error: `File is too large. Maximum supported size is ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB.` },
          { status: 413 },
        )
      }
    }

    const formData = await request.formData()
    const fileEntry = formData.get("file")

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const organizerWallet = normalizeWalletIdentifier((formData.get("organizerWallet") as string | null) ?? null)

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("[v0] BLOB_READ_WRITE_TOKEN not configured, skipping NFT image upload")
      return NextResponse.json(
        { error: "Blob storage not configured. Please add BLOB_READ_WRITE_TOKEN environment variable." },
        { status: 503 },
      )
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is too large. Maximum supported size is ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB.` },
        { status: 413 },
      )
    }

    const contentType = resolveMimeType(fileEntry)
    if (!contentType) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image." },
        { status: 400 },
      )
    }

    const extension = getExtension(fileEntry.name) ?? "bin"
    const objectKey = `nft-images/${organizerWallet}/${Date.now()}-${randomUUID()}.${extension}`

    const blob = await put(objectKey, fileEntry, {
      access: "public",
      contentType,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("[v0] NFT image upload error:", error)
    return NextResponse.json({ error: "Failed to upload NFT image" }, { status: 500 })
  }
}
