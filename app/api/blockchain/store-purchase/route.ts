import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      organizerWallet,
      storeItemId,
      quantity,
      pricePaid,
      transactionHash,
      mintedTokens,
      customName,
      customDescription,
    } = body

    if (
      !organizerWallet ||
      !storeItemId ||
      !quantity ||
      !pricePaid ||
      !transactionHash ||
      !Array.isArray(mintedTokens) ||
      mintedTokens.length === 0
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from("organizer_inventory")
      .insert({
        organizer_wallet: organizerWallet,
        store_item_id: storeItemId,
        is_custom_minted: false,
        custom_name: customName || null,
        custom_description: customDescription || null,
        quantity,
        awarded_count: 0,
        transaction_hash: transactionHash,
        blockchain_status: "confirmed",
        mint_cost: Number(pricePaid),
        blockchain_tokens: mintedTokens,
      })
      .select()
      .single()

    if (inventoryError) {
      console.error("[v0] Store purchase inventory error:", inventoryError)
      return NextResponse.json({ error: inventoryError.message }, { status: 400 })
    }
    console.log("[v0] Store purchase saved for", organizerWallet, "inventory id:", inventory.id)

    const { error: historyError } = await supabaseAdmin.from("purchase_history").insert({
      organizer_wallet: organizerWallet,
      store_item_id: storeItemId,
      inventory_id: inventory.id,
      price_paid: pricePaid,
      payment_method: "sui",
    })

    if (historyError) {
      console.error("[v0] Store purchase history error:", historyError)
      return NextResponse.json({ error: historyError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, inventoryId: inventory.id })
  } catch (error) {
    console.error("[v0] Store purchase API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
