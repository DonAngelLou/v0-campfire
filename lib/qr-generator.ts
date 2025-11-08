// QR Code generation utility
export function generateProfileQRData(walletAddress: string): string {
  // For now, return the full profile URL
  // In production, this would be the actual deployed URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://g5campfire.vercel.app"
  return `${baseUrl}/profile/${walletAddress}`
}

export function generateQRCodeDataURL(data: string): string {
  // For simulation, we'll use a QR code API service
  // In production, you might want to use a library like 'qrcode' for client-side generation
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`
}
