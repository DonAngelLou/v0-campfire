import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const wallet = searchParams.get("wallet")

  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  const supabase = createClient()

  const { data: user, error } = await supabase.from("users").select("*").eq("wallet_address", wallet).maybeSingle()

  if (error) {
    console.error("[v0] Error fetching user:", error)
    return NextResponse.json({ error: "Database error" }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
