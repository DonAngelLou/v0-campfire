"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScanLine, Search, Camera } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface QRScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onUserScanned: (walletAddress: string) => void
}

export function QRScannerDialog({ open, onOpenChange, eventId, onUserScanned }: QRScannerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [simulatedScan, setSimulatedScan] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSearchQuery("")
      setSearchResults([])
      setSimulatedScan("")
    } else {
      // Clean up camera stream when dialog closes
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
    }
  }, [open])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    const supabase = createClient()

    const { data } = await supabase
      .from("users")
      .select("wallet_address, sui_wallet_address, display_name, avatar_url")
      .or(
        `display_name.ilike.%${searchQuery}%,wallet_address.ilike.%${searchQuery}%,sui_wallet_address.ilike.%${searchQuery}%`,
      )
      .limit(10)

    setSearchResults(data || [])
    setIsSearching(false)
  }

  const handleSimulatedScan = () => {
    if (!simulatedScan.trim()) return

    // Extract wallet address from URL or use as-is
    let walletAddress = simulatedScan
    if (simulatedScan.includes("/profile/")) {
      walletAddress = simulatedScan.split("/profile/")[1]
    }

    onUserScanned(walletAddress)
    onOpenChange(false)
  }

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("[v0] Camera access error:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Scan or Search User
          </DialogTitle>
          <DialogDescription>
            Scan a QR code or search for a user to validate, award badges, or add stamps
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="gap-2">
              <Camera className="w-4 h-4" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden relative">
                {stream ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
                    <Button onClick={startCamera}>Start Camera</Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="simulatedScan">Or Enter Profile URL / Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="simulatedScan"
                    placeholder="https://g5campfire.vercel.app/profile/0x... or wallet address"
                    value={simulatedScan}
                    onChange={(e) => setSimulatedScan(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSimulatedScan()}
                  />
                  <Button onClick={handleSimulatedScan}>Validate</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search by Name or Wallet Address</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Enter display name or wallet address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.wallet_address}
                    className="p-3 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => {
                      onUserScanned(user.sui_wallet_address || user.wallet_address)
                      onOpenChange(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url || "/placeholder.svg"}
                            alt={user.display_name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="font-semibold text-primary">{user.display_name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {user.sui_wallet_address || user.wallet_address}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No users found</p>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
