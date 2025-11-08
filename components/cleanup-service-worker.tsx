"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function CleanupServiceWorker() {
  const [swFound, setSwFound] = useState(false)
  const [cleaned, setCleaned] = useState(false)

  useEffect(() => {
    // Check if service worker is registered
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          setSwFound(true)
          console.log("[v0] 🔴 Found old service worker registrations:", registrations.length)
          console.log("[v0] 🧹 Click 'Clean Up' button to remove them")
        } else {
          console.log("[v0] ✅ No service workers found")
        }
      })
    }
  }, [])

  const cleanupServiceWorker = async () => {
    console.log("[v0] 🚀 Starting cleanup...")
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()

      for (const registration of registrations) {
        await registration.unregister()
        console.log("[v0] ✅ Unregistered service worker:", registration.scope)
      }

      // Clear all caches
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
        console.log("[v0] ✅ Deleted cache:", cacheName)
      }

      setCleaned(true)
      setSwFound(false)
      console.log("[v0] 🎉 Cleanup complete! Reloading page...")

      // Reload page to complete cleanup
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }

  if (!swFound && !cleaned) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant={cleaned ? "default" : "destructive"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Service Worker Detected</AlertTitle>
        <AlertDescription className="mt-2">
          {cleaned ? (
            <span className="text-sm font-medium">Service worker cleaned! Reloading...</span>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">An old service worker is causing errors. Click below to remove it.</p>
              <Button size="sm" variant="outline" onClick={cleanupServiceWorker} className="w-full bg-transparent">
                Clean Up Now
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
}
