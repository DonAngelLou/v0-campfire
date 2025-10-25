"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "./ui/button"
import { LogOut, User, Trophy, LayoutDashboard, Users, ShoppingBag } from "lucide-react"
import { CreateOrganizationDialog } from "./create-organization-dialog"
import { Building2 } from "lucide-react"

export function AppHeader() {
  const { user, logout } = useAuth()

  if (!user) return null

  const isOrganizer = user.role === "organizer"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href={`/profile/${user.wallet_address}`} className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🔥</span>
            </div>
            Campfire
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            <Link href={`/profile/${user.wallet_address}`}>
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
            {isOrganizer && (
              <>
                <Link href="/store">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Store
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <CreateOrganizationDialog>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Create Organization</span>
            </Button>
          </CreateOrganizationDialog>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
