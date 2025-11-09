import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const ACTIVE_STATUSES = ["active", "payment_pending", "awaiting_transfer"]

const listingSelect = `
  *,
  holding:user_nft_holdings (
    id,
    award_id,
    blockchain_object_id,
    current_owner,
    owner_acquired_at,
    metadata,
    award:awards (
      id,
      awarded_at,
      notes,
      is_sold,
      sold_at,
      sold_to_wallet,
      organizer_inventory (
        id,
        organizer_wallet,
        is_custom_minted,
        custom_name,
        custom_description,
        custom_image_url,
        store_items (*)
      ),
      organizers (
        org_name,
        wallet_address
      )
    )
  )
`

async function fetchListing(id: string) {
  const { data, error } = await supabaseAdmin
    .from("nft_listings")
    .select(listingSelect)
    .eq("id", id)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const seller = url.searchParams.get("seller")
    const buyer = url.searchParams.get("buyer")
    const participant = url.searchParams.get("wallet")
    const statusFilter = url.searchParams.get("status")
    const limit = Number(url.searchParams.get("limit") ?? "50")

    let query = supabaseAdmin.from("nft_listings").select(listingSelect).order("created_at", { ascending: false })

    if (seller) {
      query = query.eq("seller_wallet", seller)
    }

    if (buyer) {
      query = query.eq("buyer_wallet", buyer)
    }

    if (participant) {
      query = query.or(`seller_wallet.eq.${participant},buyer_wallet.eq.${participant}`)
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter)
    } else if (!seller && !buyer && !participant) {
      query = query.eq("status", "active")
    }

    query = query.limit(Number.isNaN(limit) ? 50 : Math.max(1, Math.min(100, limit)))

    const { data, error } = await query

    if (error) {
      console.error("[v0] Marketplace listings fetch error:", error)
      return NextResponse.json({ error: "Failed to load listings" }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error("[v0] Marketplace listings GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

interface CreatePayload {
  action: "create"
  holdingId: string
  price: number
  sellerWallet: string
}

interface CancelPayload {
  action: "cancel"
  listingId: string
  sellerWallet: string
}

interface PurchasePayload {
  action: "purchase"
  listingId: string
  buyerWallet: string
}

interface ReleasePayload {
  action: "release"
  listingId: string
  wallet: string
}

interface PaymentSubmittedPayload {
  action: "payment-submitted"
  listingId: string
  buyerWallet: string
  paymentTxHash: string
}

interface CompletePayload {
  action: "complete"
  listingId: string
  sellerWallet: string
  transferTxHash: string
}

type MarketplacePayload =
  | CreatePayload
  | CancelPayload
  | PurchasePayload
  | ReleasePayload
  | PaymentSubmittedPayload
  | CompletePayload

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as MarketplacePayload
    if (!payload?.action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 })
    }

    switch (payload.action) {
      case "create":
        return createListing(payload)
      case "cancel":
        return cancelListing(payload)
      case "purchase":
        return reserveListing(payload)
      case "release":
        return releaseListing(payload)
      case "payment-submitted":
        return markPaymentSubmitted(payload)
      case "complete":
        return completeListing(payload)
      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Marketplace listings POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function createListing(body: CreatePayload) {
  const price = Number(body.price)
  if (!body.holdingId || !body.sellerWallet || Number.isNaN(price) || price <= 0) {
    return NextResponse.json({ error: "Invalid listing payload" }, { status: 400 })
  }

  const { data: holding, error: holdingError } = await supabaseAdmin
    .from("user_nft_holdings")
    .select("id, current_owner")
    .eq("id", body.holdingId)
    .single()

  if (holdingError || !holding) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 })
  }

  if (holding.current_owner !== body.sellerWallet) {
    return NextResponse.json({ error: "You no longer own this NFT" }, { status: 403 })
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("nft_listings")
    .select("id")
    .eq("holding_id", body.holdingId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle()

  if (existingError) {
    console.error("[v0] Existing listing check failed:", existingError)
    return NextResponse.json({ error: "Failed to validate listing state" }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: "This NFT already has an active listing" }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from("nft_listings")
    .insert({
      holding_id: body.holdingId,
      seller_wallet: body.sellerWallet,
      price_sui: Number(price.toFixed(4)),
      status: "active",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Listing creation error:", error)
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 })
  }

  const listing = await fetchListing(data.id)
  return NextResponse.json({ success: true, listing })
}

async function cancelListing(body: CancelPayload) {
  if (!body.listingId || !body.sellerWallet) {
    return NextResponse.json({ error: "Invalid cancel payload" }, { status: 400 })
  }

  const listing = await fetchListing(body.listingId)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (listing.seller_wallet !== body.sellerWallet) {
    return NextResponse.json({ error: "Only the seller can cancel this listing" }, { status: 403 })
  }

  if (listing.status !== "active") {
    return NextResponse.json({ error: "Only active listings can be cancelled" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("nft_listings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", body.listingId)

  if (error) {
    console.error("[v0] Listing cancel error:", error)
    return NextResponse.json({ error: "Failed to cancel listing" }, { status: 500 })
  }

  const refreshed = await fetchListing(body.listingId)
  return NextResponse.json({ success: true, listing: refreshed })
}

async function reserveListing(body: PurchasePayload) {
  if (!body.listingId || !body.buyerWallet) {
    return NextResponse.json({ error: "Invalid purchase payload" }, { status: 400 })
  }

  const listing = await fetchListing(body.listingId)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (listing.status !== "active") {
    return NextResponse.json({ error: "This listing is no longer available" }, { status: 400 })
  }

  if (listing.seller_wallet === body.buyerWallet) {
    return NextResponse.json({ error: "You already own this NFT" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("nft_listings")
    .update({
      status: "payment_pending",
      buyer_wallet: body.buyerWallet,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.listingId)

  if (error) {
    console.error("[v0] Listing reserve error:", error)
    return NextResponse.json({ error: "Failed to reserve listing" }, { status: 500 })
  }

  const refreshed = await fetchListing(body.listingId)
  return NextResponse.json({ success: true, listing: refreshed })
}

async function releaseListing(body: ReleasePayload) {
  if (!body.listingId || !body.wallet) {
    return NextResponse.json({ error: "Invalid release payload" }, { status: 400 })
  }

  const listing = await fetchListing(body.listingId)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (listing.status !== "payment_pending") {
    return NextResponse.json({ error: "Listing is not reserved" }, { status: 400 })
  }

  if (listing.buyer_wallet !== body.wallet && listing.seller_wallet !== body.wallet) {
    return NextResponse.json({ error: "Not authorized to release this listing" }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from("nft_listings")
    .update({
      status: "active",
      buyer_wallet: null,
      payment_transaction_hash: null,
      payment_submitted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.listingId)

  if (error) {
    console.error("[v0] Listing release error:", error)
    return NextResponse.json({ error: "Failed to release listing" }, { status: 500 })
  }

  const refreshed = await fetchListing(body.listingId)
  return NextResponse.json({ success: true, listing: refreshed })
}

async function markPaymentSubmitted(body: PaymentSubmittedPayload) {
  if (!body.listingId || !body.buyerWallet || !body.paymentTxHash) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 400 })
  }

  const listing = await fetchListing(body.listingId)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (listing.status !== "payment_pending") {
    return NextResponse.json({ error: "Listing is not awaiting payment" }, { status: 400 })
  }

  if (listing.buyer_wallet !== body.buyerWallet) {
    return NextResponse.json({ error: "This listing is reserved by another buyer" }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from("nft_listings")
    .update({
      status: "awaiting_transfer",
      payment_transaction_hash: body.paymentTxHash,
      payment_submitted_at: now,
      updated_at: now,
    })
    .eq("id", body.listingId)

  if (error) {
    console.error("[v0] Listing payment error:", error)
    return NextResponse.json({ error: "Failed to mark payment" }, { status: 500 })
  }

  const refreshed = await fetchListing(body.listingId)
  return NextResponse.json({ success: true, listing: refreshed })
}

async function completeListing(body: CompletePayload) {
  if (!body.listingId || !body.sellerWallet || !body.transferTxHash) {
    return NextResponse.json({ error: "Invalid completion payload" }, { status: 400 })
  }

  const listing = await fetchListing(body.listingId)
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 })
  }

  if (listing.seller_wallet !== body.sellerWallet) {
    return NextResponse.json({ error: "Only the seller can complete this sale" }, { status: 403 })
  }

  if (listing.status !== "awaiting_transfer" || !listing.buyer_wallet) {
    return NextResponse.json({ error: "Listing is not ready for transfer" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { error: holdingError } = await supabaseAdmin
    .from("user_nft_holdings")
    .update({
      current_owner: listing.buyer_wallet,
      owner_acquired_at: now,
      last_transfer_at: now,
      updated_at: now,
    })
    .eq("id", listing.holding_id)

  if (holdingError) {
    console.error("[v0] Holding update error:", holdingError)
    return NextResponse.json({ error: "Failed to update NFT ownership" }, { status: 500 })
  }

  if (listing.holding?.award_id) {
    const { error: awardError } = await supabaseAdmin
      .from("awards")
      .update({
        is_sold: true,
        sold_at: now,
        sold_to_wallet: listing.buyer_wallet,
      })
      .eq("id", listing.holding.award_id)

    if (awardError) {
      console.error("[v0] Award sale metadata error:", awardError)
    }
  }

  const { error } = await supabaseAdmin
    .from("nft_listings")
    .update({
      status: "completed",
      transfer_transaction_hash: body.transferTxHash,
      transfer_completed_at: now,
      updated_at: now,
    })
    .eq("id", body.listingId)

  if (error) {
    console.error("[v0] Listing completion error:", error)
    return NextResponse.json({ error: "Failed to finalize listing" }, { status: 500 })
  }

  const refreshed = await fetchListing(body.listingId)
  return NextResponse.json({ success: true, listing: refreshed })
}
