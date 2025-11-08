import { ExternalLink } from "lucide-react"
import { getExplorerUrl } from "@/lib/sui-blockchain"
import { Badge } from "@/components/ui/badge"

interface BlockchainBadgeProps {
  transactionHash: string | null
  size?: "sm" | "md" | "lg"
  showLink?: boolean
}

export function BlockchainBadge({ transactionHash, size = "md", showLink = false }: BlockchainBadgeProps) {
  if (!transactionHash) {
    return (
      <Badge variant="secondary" className="text-xs">
        Simulated
      </Badge>
    )
  }

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="outline" className={`bg-green-50 dark:bg-green-950 border-green-500 ${sizeClasses[size]}`}>
        On-chain
      </Badge>
      {showLink && (
        <a
          href={getExplorerUrl(
            transactionHash,
            (process.env.NEXT_PUBLIC_SUI_NETWORK as "mainnet" | "testnet") || "testnet",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="View on SUI Explorer"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}
