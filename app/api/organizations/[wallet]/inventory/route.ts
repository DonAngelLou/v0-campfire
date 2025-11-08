import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

interface RouteParams {
  wallet: string
}

type RouteContext =
  | {
      params: RouteParams | Promise<RouteParams>
    }
  | Promise<{
      params: RouteParams | Promise<RouteParams>
    }>

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  const resolvedContext = "then" in context ? await context : context
  const params = "then" in resolvedContext.params ? await resolvedContext.params : resolvedContext.params
  return params
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { wallet } = await resolveParams(context)
    if (!wallet) {
      return NextResponse.json({ error: "Missing organization wallet" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("organizer_inventory")
      .select("*, store_items(*)")
      .eq("organizer_wallet", wallet)
      .order("purchased_at", { ascending: false })

    if (error) {
      console.error("[v0] Inventory fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error("[v0] Inventory API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
