import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizerWallet, transactionHash, nftName, nftDescription, imageUrl, quantity, mintCost, mintedTokens } =
      body

    // Validate required fields
    if (!organizerWallet || !transactionHash || !nftName || !imageUrl || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Array.isArray(mintedTokens) || mintedTokens.length < Number(quantity)) {
      return NextResponse.json({ error: "Minted token metadata missing from request" }, { status: 400 })
    }

    const normalizedTokens = mintedTokens.slice(0, Number(quantity)).map((token: any) => ({
      objectId: token.objectId,
      status: "available",
      mintedTransactionHash: transactionHash,
      mintedAt: new Date().toISOString(),
    }))

    // Insert into organizer_inventory with blockchain data
    const { data, error } = await supabaseAdmin
      .from("organizer_inventory")
      .insert({
        organizer_wallet: organizerWallet,
        store_item_id: null,
        is_custom_minted: true,
        custom_name: nftName,
        custom_description: nftDescription || null,
        custom_image_url: imageUrl,
        quantity: quantity,
        awarded_count: 0,
        mint_cost: mintCost || 0,
        transaction_hash: transactionHash,
        blockchain_status: "confirmed",
        blockchain_tokens: normalizedTokens,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "Failed to save to database", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inventoryId: data.id,
      message: "NFT minted and saved successfully",
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
