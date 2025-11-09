export interface StoreItemLite {
  id: string
  name: string
  description: string
  rank: number | null
  rank_name?: string | null
  image_url: string | null
  artist_name?: string | null
}

export interface OrganizerInventoryLite {
  id: string
  organizer_wallet?: string | null
  is_custom_minted?: boolean | null
  custom_name?: string | null
  custom_description?: string | null
  custom_image_url?: string | null
  store_items?: StoreItemLite | null
}

export interface AwardLite {
  id: number
  awarded_at: string
  notes?: string | null
  organizer_inventory?: OrganizerInventoryLite | null
  organizers?: {
    org_name: string | null
    wallet_address: string
  } | null
  is_sold?: boolean
  sold_at?: string | null
  sold_to_wallet?: string | null
}

export interface UserNftHolding {
  id: string
  award_id?: number
  blockchain_object_id: string
  current_owner: string
  owner_acquired_at: string
  metadata?: Record<string, unknown> | null
  award?: AwardLite | null
}

export type ListingStatus = "active" | "payment_pending" | "awaiting_transfer" | "completed" | "cancelled"

export interface NftListing {
  id: string
  holding_id: string
  seller_wallet: string
  price_sui: number
  status: ListingStatus
  buyer_wallet?: string | null
  payment_transaction_hash?: string | null
  payment_submitted_at?: string | null
  transfer_transaction_hash?: string | null
  transfer_completed_at?: string | null
  cancelled_at?: string | null
  created_at: string
  updated_at: string
  holding?: UserNftHolding | null
}
