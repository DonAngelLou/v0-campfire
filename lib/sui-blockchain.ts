import type { SuiObjectChange, SuiEvent } from "@mysten/sui/client"
import { Transaction } from "@mysten/sui/transactions"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"

// Environment variables for smart contract
const CAMPFIRE_PACKAGE_ID = process.env.NEXT_PUBLIC_CAMPFIRE_PACKAGE_ID
const CAMPFIRE_CONFIG_ID = process.env.NEXT_PUBLIC_CAMPFIRE_CONFIG_ID
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS
const CAMPFIRE_MODULE = "CampfireBadge"
const CAMPFIRE_BADGE_TYPE = CAMPFIRE_PACKAGE_ID
  ? `${CAMPFIRE_PACKAGE_ID}::${CAMPFIRE_MODULE}::BadgeNFT`
  : undefined
const textEncoder = new TextEncoder()

export const SUI_DECIMALS = 1_000_000_000

export const suiToMist = (amount: number) => Math.max(Math.round((amount || 0) * SUI_DECIMALS), 0)
export const mistToSui = (amount: number) => (amount || 0) / SUI_DECIMALS

const stringToBytes = (value: string) => Array.from(textEncoder.encode(value))

const ensureSuiAddress = (value: string) => {
  const normalized = (value || "").trim().toLowerCase()
  if (!normalized) {
    throw new Error("Sui address is required")
  }
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`
}

// Type definitions for blockchain responses
export interface MintPaidResponse {
  success: boolean
  transactionHash?: string
  nftId?: string
  error?: string
}

export interface AwardFreeResponse {
  success: boolean
  transactionHash?: string
  error?: string
}

// Validate environment variables
export function validateBlockchainConfig(): { valid: boolean; error?: string } {
  if (!CAMPFIRE_PACKAGE_ID) {
    return { valid: false, error: "NEXT_PUBLIC_CAMPFIRE_PACKAGE_ID is not configured" }
  }
  if (!CAMPFIRE_CONFIG_ID) {
    return { valid: false, error: "NEXT_PUBLIC_CAMPFIRE_CONFIG_ID is not configured" }
  }
  return { valid: true }
}

/**
 * Build transaction for paid NFT minting
 * This creates a transaction to mint a custom NFT with payment
 */
export function buildMintPaidTransaction(params: {
  name: string
  description: string
  imageUrl: string
  metadataUri?: string
  rank?: string
  quantity: number
  recipientAddress: string
  issuerAddress: string
  expectedPrice: number
}): Transaction {
  const tx = new Transaction()
  const rank = params.rank ?? "Custom"
  const metadataUri = params.metadataUri ?? params.imageUrl
  const pricePerMint = Math.max(params.expectedPrice, 0)
  const normalizedRecipient = ensureSuiAddress(params.recipientAddress)
  const normalizedIssuer = ensureSuiAddress(params.issuerAddress)

  for (let i = 0; i < Math.max(params.quantity, 1); i++) {
    const paymentCoin = tx.splitCoins(tx.gas, [tx.pure.u64(pricePerMint)])

    tx.moveCall({
      target: `${CAMPFIRE_PACKAGE_ID}::${CAMPFIRE_MODULE}::mint_badge_paid`,
      arguments: [
        tx.object(CAMPFIRE_CONFIG_ID!), // Config object shared on chain
        paymentCoin, // Payment coin
        tx.pure.u64(pricePerMint), // Expected price
        tx.pure.address(normalizedRecipient), // Recipient wallet
        tx.pure.address(normalizedIssuer), // Issuer wallet
        tx.pure.vector("u8", stringToBytes(params.name)),
        tx.pure.vector("u8", stringToBytes(params.description)),
        tx.pure.vector("u8", stringToBytes(rank)),
        tx.pure.vector("u8", stringToBytes(params.imageUrl)),
        tx.pure.vector("u8", stringToBytes(metadataUri)),
      ],
    })
  }

  return tx
}

/**
 * Build transaction for free NFT awarding
 * This creates a transaction to award an NFT without payment
 */
export function buildAwardFreeTransaction(params: {
  recipientAddress: string
  issuerAddress: string
  name: string
  description: string
  rank: string
  imageUrl: string
  metadataUri?: string
}): Transaction {
  const tx = new Transaction()

  tx.moveCall({
    target: `${CAMPFIRE_PACKAGE_ID}::${CAMPFIRE_MODULE}::award_badge_free`,
    arguments: [
      tx.pure.address(ensureSuiAddress(params.recipientAddress)),
      tx.pure.address(ensureSuiAddress(params.issuerAddress)),
      tx.pure.vector("u8", stringToBytes(params.name)),
      tx.pure.vector("u8", stringToBytes(params.description)),
      tx.pure.vector("u8", stringToBytes(params.rank)),
      tx.pure.vector("u8", stringToBytes(params.imageUrl)),
      tx.pure.vector("u8", stringToBytes(params.metadataUri ?? params.imageUrl)),
    ],
  })

  return tx
}

export function buildTransferBadgeTransaction(params: {
  badgeObjectId: string
  newOwnerAddress: string
  salePrice?: number
}): Transaction {
  const tx = new Transaction()
  const normalizedOwner = ensureSuiAddress(params.newOwnerAddress)
  const salePrice = Math.max(params.salePrice ?? 0, 0)
  const paymentCoin = tx.splitCoins(tx.gas, [tx.pure.u64(salePrice)])

  tx.moveCall({
    target: `${CAMPFIRE_PACKAGE_ID}::${CAMPFIRE_MODULE}::transfer_badge_with_royalty`,
    arguments: [
      tx.object(CAMPFIRE_CONFIG_ID!), // Config
      tx.object(params.badgeObjectId), // Owned BadgeNFT object
      paymentCoin,
      tx.pure.address(normalizedOwner),
    ],
  })

  return tx
}

export function buildTreasuryPaymentTransaction(amountMist: number, recipientAddress?: string): Transaction {
  const tx = new Transaction()
  const normalizedAmount = Math.max(amountMist, 0)
  const targetAddress = recipientAddress ?? TREASURY_ADDRESS

  if (!targetAddress) {
    throw new Error("NEXT_PUBLIC_TREASURY_ADDRESS is not configured")
  }

  const destination = ensureSuiAddress(targetAddress)

  const paymentCoin = tx.splitCoins(tx.gas, [tx.pure.u64(normalizedAmount)])
  tx.transferObjects([paymentCoin], tx.pure.address(destination))

  return tx
}

/**
 * Hook to execute blockchain transactions
 * This provides a unified interface for signing and executing transactions
 */
export function useBlockchainTransaction() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const suiClient = useSuiClient()

  const executeTransaction = async (
    tx: Transaction,
  ): Promise<{ digest: string; success: boolean; objectChanges: SuiObjectChange[]; events: SuiEvent[] }> => {
    try {
      const result = await signAndExecuteTransaction({
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      })

      // Wait for transaction confirmation
      const txResponse = await suiClient.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      })

      return {
        digest: result.digest,
        success: txResponse.effects?.status?.status === "success",
        objectChanges: txResponse.objectChanges ?? [],
        events: txResponse.events ?? [],
      }
    } catch (error) {
      console.error("[v0] Blockchain transaction error:", error)
      throw error
    }
  }

  return { executeTransaction }
}

/**
 * Get SUI explorer URL for a transaction
 */
export function getExplorerUrl(txHash: string, network: "mainnet" | "testnet" = "testnet"): string {
  const baseUrl = network === "mainnet" ? "https://suiscan.xyz/mainnet" : "https://suiscan.xyz/testnet"
  return `${baseUrl}/tx/${txHash}`
}

export function isCampfireBadgeObject(change: SuiObjectChange | undefined) {
  if (!change || change.type !== "created" || !CAMPFIRE_BADGE_TYPE) {
    return false
  }
  return change.objectType === CAMPFIRE_BADGE_TYPE
}
