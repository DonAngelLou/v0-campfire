import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inventoryId,
      recipientWallet,
      awardedBy,
      challengeId,
      transactionHash,
      notes,
      blockchainObjectId,
      eventId,
    } = body

    // Validate required fields
    if (!inventoryId || !recipientWallet || !awardedBy || !transactionHash || !blockchainObjectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Call the decrement_inventory function
    const { data: decrementResult, error: decrementError } = await supabase.rpc("decrement_inventory", {
      inventory_item_id: inventoryId,
    })

    if (decrementError || !decrementResult?.[0]?.success) {
      return NextResponse.json(
        {
          error: "Failed to decrement inventory",
          details: decrementResult?.[0]?.message || decrementError?.message,
        },
        { status: 400 },
      )
    }

    // Mark the specific token as awarded
    const { data: inventoryRow, error: inventoryError } = await supabase
      .from("organizer_inventory")
      .select("blockchain_tokens")
      .eq("id", inventoryId)
      .single()

    if (inventoryError) {
      console.error("[v0] Inventory lookup error:", inventoryError)
      return NextResponse.json({ error: "Failed to load inventory tokens", details: inventoryError.message }, { status: 500 })
    }

    const tokens: any[] = Array.isArray(inventoryRow?.blockchain_tokens) ? inventoryRow.blockchain_tokens : []
    const updatedTokens = tokens.map((token) =>
      token.objectId === blockchainObjectId
        ? {
            ...token,
            status: "awarded",
            awardedTransactionHash: transactionHash,
            awardedAt: new Date().toISOString(),
            awardedTo: recipientWallet,
          }
        : token,
    )

    const tokenWasUpdated = updatedTokens.some(
      (token) => token.objectId === blockchainObjectId && token.status === "awarded",
    )

    if (!tokenWasUpdated) {
      return NextResponse.json({ error: "Blockchain token not found for inventory item" }, { status: 404 })
    }

    const { error: tokenUpdateError } = await supabase
      .from("organizer_inventory")
      .update({ blockchain_tokens: updatedTokens })
      .eq("id", inventoryId)

    if (tokenUpdateError) {
      console.error("[v0] Token update error:", tokenUpdateError)
      return NextResponse.json({ error: "Failed to update inventory tokens", details: tokenUpdateError.message }, { status: 500 })
    }

    // Create award record with blockchain data
    const { data: award, error: awardError } = await supabase
      .from("awards")
      .insert({
        challenge_id: challengeId,
        recipient_wallet: recipientWallet,
        awarded_by: awardedBy,
        inventory_id: inventoryId,
        transaction_hash: transactionHash,
        blockchain_status: "confirmed",
        blockchain_object_id: blockchainObjectId,
        notes: notes || null,
        event_id: eventId ?? null,
      })
      .select()
      .single()

    if (awardError) {
      console.error("[v0] Award creation error:", awardError)
      return NextResponse.json({ error: "Failed to create award", details: awardError.message }, { status: 500 })
    }

    const { error: holdingError } = await supabase.from("user_nft_holdings").insert({
      award_id: award.id,
      blockchain_object_id: blockchainObjectId,
      current_owner: recipientWallet,
      metadata: {
        inventory_id: inventoryId,
        event_id: eventId ?? null,
      },
    })

    if (holdingError) {
      console.error("[v0] Holding creation error:", holdingError)
    }

    return NextResponse.json({
      success: true,
      awardId: award.id,
      remainingQuantity: decrementResult[0].remaining_quantity,
      message: "Badge awarded successfully",
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
