"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScanLine, Search, Camera } from "lucide-react"
import { createClient } from "@/lib/supabase"
import jsQR from "jsqr"

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraSupported, setCameraSupported] = useState(false)
  const [cameraSupportMessage, setCameraSupportMessage] = useState<string | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const isLocalhost =
      typeof window !== "undefined" &&
      /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(
        window.location.hostname,
      )

    if (typeof window !== "undefined" && !window.isSecureContext && !isLocalhost) {
      setCameraSupported(false)
      setCameraSupportMessage("Camera access requires HTTPS or running on localhost.")
      return
    }
    if (typeof navigator === "undefined") {
      setCameraSupported(false)
      setCameraSupportMessage("Camera access is unavailable in this environment.")
      return
    }
    const hasModernAPI = !!navigator.mediaDevices?.getUserMedia
    const legacyGetUserMedia =
      (navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia
    if (!hasModernAPI && !legacyGetUserMedia) {
      setCameraSupported(false)
      setCameraSupportMessage("This browser does not expose camera APIs. Please use a modern browser.")
      return
    }
    setCameraSupported(true)
    setCameraSupportMessage(null)
  }, [])

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSearchQuery("")
      setSearchResults([])
      setSimulatedScan("")
      setCameraError(null)
    } else {
      // Clean up camera stream when dialog closes
      stopCamera()
    }
  }, [open, stopCamera])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

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

  const handleDetectedWallet = useCallback(
    (value: string) => {
      if (!value) return
      let walletAddress = value.trim()
      if (walletAddress.includes("/profile/")) {
        walletAddress = walletAddress.split("/profile/")[1]
      }
      if (!walletAddress) return
      stopCamera()
      onUserScanned(walletAddress)
      onOpenChange(false)
    },
    [onOpenChange, onUserScanned, stopCamera],
  )

  const handleSimulatedScan = () => {
    if (!simulatedScan.trim()) return
    handleDetectedWallet(simulatedScan)
  }

  const requestCameraStream = async () => {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    }
    const legacyGetUserMedia =
      (navigator as any).getUserMedia || (navigator as any).webkitGetUserMedia || (navigator as any).mozGetUserMedia
    if (legacyGetUserMedia) {
      return new Promise<MediaStream>((resolve, reject) =>
        legacyGetUserMedia.call(navigator, { video: { facingMode: "environment" } }, resolve, reject),
      )
    }
    throw new Error("Camera APIs are unavailable in this browser or context.")
  }

  const startCamera = async () => {
    if (!cameraSupported) {
      setCameraError(cameraSupportMessage || "Camera access is not supported in this browser or context.")
      return
    }
    try {
      const mediaStream = await requestCameraStream()
      setStream(mediaStream)
      setCameraError(null)
    } catch (error) {
      console.error("[v0] Camera access error:", error)
      setCameraError(
        error instanceof Error ? error.message : "Unable to access camera. Please grant permission or try HTTPS.",
      )
    }
  }

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const video = videoRef.current
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }
    const canvas = canvasRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) {
      animationFrameRef.current = requestAnimationFrame(scanFrame)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })
      if (code?.data) {
        handleDetectedWallet(code.data)
        return
      }
    } catch (error) {
      console.error("[v0] QR scan error:", error)
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame)
  }, [handleDetectedWallet])

  useEffect(() => {
    if (!stream || !videoRef.current) {
      return
    }

    const video = videoRef.current
    video.srcObject = stream
    const playVideo = async () => {
      try {
        await video.play()
      } catch {
        // Autoplay might be blocked; user interaction will start playback.
      }
    }
    void playVideo()

    animationFrameRef.current = requestAnimationFrame(scanFrame)

    return () => {
      video.srcObject = null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [stream, scanFrame])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-primary/80 rounded-lg pointer-events-none"></div>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 text-xs px-3 py-1 rounded-full text-muted-foreground">
                      Align QR code within the frame
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={stopCamera}
                      className="absolute top-3 right-3 bg-background/80"
                    >
                      Stop Camera
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground" />
                    {cameraError || cameraSupportMessage ? (
                      <p className="text-sm text-destructive">{cameraError || cameraSupportMessage}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Use a camera-enabled device and grant permission to scan QR codes.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={startCamera} disabled={!cameraSupported}>
                  Start Camera
                </Button>
                <Button variant="outline" onClick={stopCamera} disabled={!stream} className="bg-transparent">
                  Stop Camera
                </Button>
              </div>
              <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

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
