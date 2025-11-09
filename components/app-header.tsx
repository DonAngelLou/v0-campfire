"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, User, Users, Building2, Calendar, Menu, X } from "lucide-react"

import { useWalletAuth } from "@/hooks/use-wallet-auth"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "./ui/button"
import { createClient } from "@/lib/supabase"

export function AppHeader() {
  const { user, logout } = useWalletAuth()
  const router = useRouter()
  const [firstOrgWallet, setFirstOrgWallet] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const userWallet = user?.sui_wallet_address || user?.wallet_address

  useEffect(() => {
    if (!user) return

    const fetchFirstOrg = async () => {
      const supabase = createClient()
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_wallet")
        .eq("user_wallet", user.wallet_address)
        .eq("status", "active")
        .order("accepted_at", { ascending: false })
        .limit(1)

      if (memberships && memberships.length > 0) {
        setFirstOrgWallet(memberships[0].organization_wallet)
      }
    }

    fetchFirstOrg()
  }, [user])

  const handleLogout = () => {
    logout()
    router.push("/login")
    setMobileNavOpen(false)
  }

  const handleOrganizationClick = () => {
    const targetWallet = firstOrgWallet || userWallet
    if (targetWallet) {
      window.open(`/organizer/${targetWallet}`, "_blank")
    }
    setMobileNavOpen(false)
  }

  const navLinks = [
    {
      label: "My Profile",
      href: userWallet ? `/profile/${userWallet}` : "/profile",
      icon: <User className="w-4 h-4" />,
    },
    {
      label: "Users",
      href: "/users",
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Events",
      href: "/challenges",
      icon: <Calendar className="w-4 h-4" />,
    },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href={userWallet ? `/profile/${userWallet}` : "/"}
            className="flex items-center gap-2 font-bold text-lg sm:text-xl whitespace-nowrap"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">dY"�</span>
            </div>
            Campfire
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {link.icon}
                    {link.label}
                  </Button>
                </Link>
              ))}
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleOrganizationClick}>
                <Building2 className="w-4 h-4" />
                Organization
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <Button
              className="inline-flex items-center justify-center rounded-md border border-border p-2 md:hidden"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 hidden sm:inline-flex">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {user && mobileNavOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} onClick={() => setMobileNavOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  {link.icon}
                  {link.label}
                </Button>
              </Link>
            ))}
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleOrganizationClick}>
              <Building2 className="w-4 h-4" />
              Organization
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
