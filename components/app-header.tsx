"use client"

import Link from "next/link"
import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "./ui/button"
import { LogOut, User, Trophy, Users, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function AppHeader() {
  const { user, logout } = useWalletAuth()
  const router = useRouter()

  const userWallet = user?.sui_wallet_address || user?.wallet_address

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleOrganizationClick = () => {
    if (userWallet) {
      window.open(`/organizer/${userWallet}`, "_blank")
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={userWallet ? `/profile/${userWallet}` : "/"}
            className="flex items-center gap-2 font-bold text-xl"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🔥</span>
            </div>
            Campfire
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-4">
              <Link href={`/profile/${userWallet}`}>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  My Profile
                </Button>
              </Link>
              <Link href="/users">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </Button>
              </Link>
              <Link href="/challenges">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Challenges
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleOrganizationClick}>
                <Building2 className="w-4 h-4" />
                Organization
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
