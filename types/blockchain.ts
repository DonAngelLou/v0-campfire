// Type definitions for blockchain integration

export interface BlockchainInventoryItem {
  id: string
  organizer_wallet: string
  store_item_id?: string
  is_custom_minted: boolean
  custom_name?: string
  custom_description?: string
  custom_image_url?: string
  quantity: number
  awarded_count: number
  transaction_hash?: string
  blockchain_status: "pending" | "confirmed" | "failed"
  mint_cost?: number
  created_at: string
  blockchain_tokens?: BlockchainToken[]
}

export interface BlockchainAward {
  id: string
  challenge_id: number
  recipient_wallet: string
  awarded_by: string
  inventory_id: string
  transaction_hash?: string
  blockchain_status: "pending" | "confirmed" | "failed"
  notes?: string
  awarded_at: string
  blockchain_object_id?: string
}

export interface BlockchainToken {
  objectId: string
  status: "available" | "awarded"
  mintedTransactionHash?: string
  mintedAt?: string
  awardedTransactionHash?: string
  awardedAt?: string
  awardedTo?: string | null
}

export interface MintTransactionParams {
  name: string
  description: string
  imageUrl: string
  quantity: number
  metadataUri?: string
  rank?: string
  recipientAddress: string
  issuerAddress: string
  expectedPrice: number
}

export interface AwardTransactionParams {
  recipientAddress: string
  nftObjectId: string
}

export interface TransactionResult {
  digest: string
  success: boolean
}
