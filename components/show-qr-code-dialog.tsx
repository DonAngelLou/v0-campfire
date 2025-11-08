"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode, Download } from "lucide-react"
import { generateProfileQRData, generateQRCodeDataURL } from "@/lib/qr-generator"

interface ShowQRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletAddress: string
  displayName: string
}

export function ShowQRCodeDialog({ open, onOpenChange, walletAddress, displayName }: ShowQRCodeDialogProps) {
  const [qrDataURL, setQrDataURL] = useState<string>("")

  useEffect(() => {
    if (open) {
      const qrData = generateProfileQRData(walletAddress)
      const dataURL = generateQRCodeDataURL(qrData)
      setQrDataURL(dataURL)
    }
  }, [open, walletAddress])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = qrDataURL
    link.download = `${displayName}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Profile QR Code
          </DialogTitle>
          <DialogDescription>Share this QR code for easy profile access</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-lg border-2 border-border">
            {qrDataURL && (
              <img src={qrDataURL || "/placeholder.svg"} alt={`QR Code for ${displayName}`} className="w-64 h-64" />
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
            </p>
          </div>

          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
