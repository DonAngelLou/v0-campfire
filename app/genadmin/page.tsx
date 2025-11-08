"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  Trophy,
  Award,
  Activity,
  Database,
  TrendingUp,
  Search,
  Trash2,
  Shield,
  Eye,
  ShoppingCart,
  Plus,
  Edit,
  Coins,
  Package,
  BarChart,
  XCircle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateUserId } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface SystemStats {
  totalUsers: number
  totalOrganizers: number
  totalChallenges: number
  totalAwards: number
  newUsersToday: number
  newUsersWeek: number
  activeChallenges: number
  pendingApplications: number
}

interface User {
  wallet_address: string
  display_name: string
  role: string
  created_at: string
  bio?: string
}

interface Organization {
  wallet_address: string
  org_name: string
  org_description?: string
  verified: boolean
  created_at: string
}

interface Challenge {
  id: string
  title: string
  created_by: string
  status: string
  created_at: string
  applications_count?: number
}

interface AwardRecord {
  id: string
  user_wallet: string
  challenge_id: string
  awarded_at: string
  user_name?: string
  challenge_title?: string
}

interface StoreItem {
  id: string
  name: string
  description: string
  rank: number
  rank_name: string
  rank_color: string
  price: number
  image_url: string
  is_customizable: boolean
  is_active: boolean
  quantity: number
  artist_name: string | null
  artist_description: string | null
  created_at: string
}

interface PurchaseHistory {
  id: string
  organizer_wallet: string
  store_item_id: string
  price_paid: number
  purchased_at: string
  organizer_name?: string
  item_name?: string
}

const MAX_STORE_IMAGE_SIZE_MB = 5

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [dbConnected, setDbConnected] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [awards, setAwards] = useState<AwardRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sqlQuery, setSqlQuery] = useState("")
  const [sqlResult, setSqlResult] = useState<any>(null)
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseHistory[]>([])
  const [storeStats, setStoreStats] = useState({
    totalItems: 0,
    activeItems: 0,
    totalRevenue: 0,
    totalPurchases: 0,
  })

  useEffect(() => {
    console.log("[v0] Loading genadmin dashboard")
    loadDashboardData()
    loadStoreData()
  }, [])

  const loadDashboardData = async () => {
    console.log("[v0] Loading dashboard data")
    const supabase = createClient()

    try {
      // Test database connection
      const { error: pingError } = await supabase.from("users").select("count").limit(1)
      setDbConnected(!pingError)

      // Load system stats
      const [
        usersResult,
        organizersResult,
        challengesResult,
        awardsResult,
        newUsersTodayResult,
        newUsersWeekResult,
        activeChallengesResult,
        pendingAppsResult,
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("organizers").select("*", { count: "exact", head: true }),
        supabase.from("challenges").select("*", { count: "exact", head: true }),
        supabase.from("awards").select("*", { count: "exact", head: true }),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("challenges").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("challenge_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

      console.log("[v0] Users count:", usersResult.count)
      console.log("[v0] Organizers count:", organizersResult.count)
      console.log("[v0] Challenges count:", challengesResult.count)
      console.log("[v0] Awards count:", awardsResult.count)

      setStats({
        totalUsers: usersResult.count || 0,
        totalOrganizers: organizersResult.count || 0,
        totalChallenges: challengesResult.count || 0,
        totalAwards: awardsResult.count || 0,
        newUsersToday: newUsersTodayResult.count || 0,
        newUsersWeek: newUsersWeekResult.count || 0,
        activeChallenges: activeChallengesResult.count || 0,
        pendingApplications: pendingAppsResult.count || 0,
      })

      console.log("[v0] Stats set:", {
        totalUsers: usersResult.count || 0,
        totalOrganizers: organizersResult.count || 0,
        totalChallenges: challengesResult.count || 0,
        totalAwards: awardsResult.count || 0,
      })

      // Load users
      const { data: usersData } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
      setUsers(usersData || [])

      // Load organizations
      const { data: orgsData } = await supabase.from("organizers").select("*").order("created_at", { ascending: false })
      setOrganizations(orgsData || [])

      // Load challenges with application counts
      const { data: challengesData } = await supabase
        .from("challenges")
        .select("*, challenge_applications(count)")
        .order("created_at", { ascending: false })
        .limit(50)
      setChallenges(challengesData || [])

      // Load awards
      const { data: awardsData } = await supabase
        .from("awards")
        .select("*, users(display_name), challenges(title)")
        .order("awarded_at", { ascending: false })
        .limit(50)
      setAwards(awardsData || [])

      console.log("[v0] Dashboard data loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStoreData = async () => {
    console.log("[v0] Loading store data")
    const supabase = createClient()

    try {
      // Load store items
      const { data: itemsData } = await supabase.from("store_items").select("*").order("rank", { ascending: true })
      setStoreItems(itemsData || [])

      // Load purchase history with joins
      const { data: purchasesData } = await supabase
        .from("purchase_history")
        .select(`
          *,
          organizers!purchase_history_organizer_wallet_fkey(org_name),
          store_items!purchase_history_store_item_id_fkey(name)
        `)
        .order("purchased_at", { ascending: false })
        .limit(50)

      setPurchases(purchasesData || [])

      // Calculate stats
      const totalRevenue = purchasesData?.reduce((sum, p) => sum + Number(p.price_paid), 0) || 0
      setStoreStats({
        totalItems: itemsData?.length || 0,
        activeItems: itemsData?.filter((item) => item.is_active !== false).length || 0,
        totalRevenue,
        totalPurchases: purchasesData?.length || 0,
      })

      console.log("[v0] Store data loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading store data:", error)
    }
  }

  const handleDeleteUser = async (walletAddress: string) => {
    if (!confirm(`Are you sure you want to delete user ${walletAddress}?`)) return

    const supabase = createClient()
    const { error } = await supabase.from("users").delete().eq("wallet_address", walletAddress)

    if (error) {
      alert("Error deleting user: " + error.message)
    } else {
      alert("User deleted successfully")
      loadDashboardData()
    }
  }

  const handleToggleVerification = async (walletAddress: string, currentStatus: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("organizers")
      .update({ verified: !currentStatus })
      .eq("wallet_address", walletAddress)

    if (error) {
      alert("Error updating verification: " + error.message)
    } else {
      alert("Verification status updated")
      loadDashboardData()
    }
  }

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm(`Are you sure you want to delete this challenge?`)) return

    const supabase = createClient()
    const { error } = await supabase.from("challenges").delete().eq("id", challengeId)

    if (error) {
      alert("Error deleting challenge: " + error.message)
    } else {
      alert("Challenge deleted successfully")
      loadDashboardData()
    }
  }

  const handleRevokeAward = async (awardId: string) => {
    if (!confirm(`Are you sure you want to revoke this award?`)) return

    const supabase = createClient()
    const { error } = await supabase.from("awards").delete().eq("id", awardId)

    if (error) {
      alert("Error revoking award: " + error.message)
    } else {
      alert("Award revoked successfully")
      loadDashboardData()
    }
  }

  const handleDeleteStoreItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this store item?")) return

    const supabase = createClient()
    const { error } = await supabase.from("store_items").delete().eq("id", itemId)

    if (error) {
      alert("Error deleting item: " + error.message)
    } else {
      alert("Item deleted successfully")
      loadStoreData()
    }
  }

  const handleToggleItemActive = async (itemId: string, currentStatus: boolean) => {
    const supabase = createClient()
    const { error } = await supabase.from("store_items").update({ is_active: !currentStatus }).eq("id", itemId)

    if (error) {
      alert("Error updating item status: " + error.message)
    } else {
      alert("Item status updated")
      loadStoreData()
    }
  }

  const handleRunSQL = async () => {
    if (!sqlQuery.trim()) return
    if (!confirm("Are you sure you want to run this SQL query? This can be dangerous!")) return

    const supabase = createClient()
    try {
      const { data, error } = await supabase.rpc("exec_sql", { query: sqlQuery })
      if (error) throw error
      setSqlResult({ success: true, data })
      alert("Query executed successfully")
    } catch (error: any) {
      setSqlResult({ success: false, error: error.message })
      alert("Query failed: " + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading Super Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter(
    (u) =>
      u.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generateUserId(u.wallet_address).includes(searchTerm),
  )

  const rankOptions = [
    { value: 1, label: "Paragon", color: "#805AD5" },
    { value: 2, label: "Luminary", color: "#D69E2E" },
    { value: 3, label: "Vanguard", color: "#38A169" },
    { value: 4, label: "Adept", color: "#4299E1" },
    { value: 5, label: "Initiate", color: "#A0AEC0" },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Shield className="w-10 h-10 text-orange-500" />
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground">System monitoring and management console</p>
      </div>

      {/* System Health Overview */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {dbConnected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{dbConnected ? "Connected" : "Disconnected"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">
                +{stats?.newUsersToday || 0} today, +{stats?.newUsersWeek || 0} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalOrganizers || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Challenges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalChallenges || 0}</p>
              <p className="text-xs text-muted-foreground">{stats?.activeChallenges || 0} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="w-4 h-4" />
                Badges Awarded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.totalAwards || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Pending Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats?.pendingApplications || 0}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        {/* Users Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage all users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, wallet, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.wallet_address}>
                        <TableCell className="font-mono text-sm">{generateUserId(user.wallet_address)}</TableCell>
                        <TableCell>{user.display_name}</TableCell>
                        <TableCell className="font-mono text-xs">{user.wallet_address}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "organizer" ? "default" : "secondary"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/profile/${user.wallet_address}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.wallet_address)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Management */}
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Manage and verify organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization Name</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.wallet_address}>
                        <TableCell className="font-semibold">{org.org_name}</TableCell>
                        <TableCell className="font-mono text-xs">{org.wallet_address}</TableCell>
                        <TableCell>
                          <Badge variant={org.verified ? "default" : "secondary"}>
                            {org.verified ? "Verified" : "Unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleVerification(org.wallet_address, org.verified)}
                            >
                              {org.verified ? "Unverify" : "Verify"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/org/${org.wallet_address}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Challenges Management */}
        <TabsContent value="challenges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Moderation</CardTitle>
              <CardDescription>Monitor and manage all challenges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.map((challenge) => (
                      <TableRow key={challenge.id}>
                        <TableCell className="font-semibold">{challenge.title}</TableCell>
                        <TableCell className="font-mono text-xs">{challenge.created_by}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              challenge.status === "open"
                                ? "default"
                                : challenge.status === "closed"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {challenge.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{challenge.applications_count || 0}</TableCell>
                        <TableCell className="text-sm">{new Date(challenge.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/challenges/${challenge.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteChallenge(challenge.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Badges Management */}
        <TabsContent value="badges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Badge Management</CardTitle>
              <CardDescription>View and manage awarded badges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Challenge</TableHead>
                      <TableHead>Awarded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {awards.map((award) => (
                      <TableRow key={award.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{award.user_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{award.user_wallet}</p>
                          </div>
                        </TableCell>
                        <TableCell>{award.challenge_title || "Unknown Challenge"}</TableCell>
                        <TableCell className="text-sm">{new Date(award.awarded_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => handleRevokeAward(award.id)}>
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store" className="space-y-4">
          {/* Store Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Total Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{storeStats.totalItems}</p>
                <p className="text-xs text-muted-foreground">{storeStats.activeItems} active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Total Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{storeStats.totalPurchases}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Total Revenue (SUI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{storeStats.totalRevenue.toFixed(2)} SUI</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  Avg Price (SUI)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {storeStats.totalPurchases > 0
                    ? (storeStats.totalRevenue / storeStats.totalPurchases || 0).toFixed(2)
                    : "0.00"}{" "}
                  SUI
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Store Items Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Store Items Management</CardTitle>
                  <CardDescription>Create, edit, and manage NFT badge designs</CardDescription>
                </div>
                <CreateStoreItemDialog onSuccess={loadStoreData} rankOptions={rankOptions} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Customizable</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: item.rank_color, color: "white" }}>{item.rank_name}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{item.price} SUI</TableCell>
                        <TableCell>{item.quantity || "∞"}</TableCell>
                        <TableCell>
                          {item.is_customizable ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.is_active !== false ? "default" : "secondary"}>
                            {item.is_active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <EditStoreItemDialog item={item} onSuccess={loadStoreData} rankOptions={rankOptions} />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleItemActive(item.id, item.is_active !== false)}
                            >
                              {item.is_active !== false ? "Disable" : "Enable"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteStoreItem(item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Purchase History */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>View all store transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Purchased</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{purchase.organizer_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{purchase.organizer_wallet}</p>
                          </div>
                        </TableCell>
                        <TableCell>{purchase.item_name || "Unknown Item"}</TableCell>
                        <TableCell className="font-semibold">{Number(purchase.price_paid).toFixed(2)} SUI</TableCell>
                        <TableCell className="text-sm">
                          {new Date(purchase.purchased_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Today</span>
                        <span className="font-semibold">+{stats?.newUsersToday || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">This Week</span>
                        <span className="font-semibold">+{stats?.newUsersWeek || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="font-semibold">{stats?.totalUsers || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Challenge Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <span className="font-semibold">{stats?.activeChallenges || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Pending Apps</span>
                        <span className="font-semibold">{stats?.pendingApplications || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="font-semibold">{stats?.totalChallenges || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Badge Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Awarded</span>
                        <span className="font-semibold">{stats?.totalAwards || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg per User</span>
                        <span className="font-semibold">
                          {stats?.totalUsers ? (stats.totalAwards / stats.totalUsers).toFixed(2) : "0"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Organization Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Orgs</span>
                        <span className="font-semibold">{stats?.totalOrganizers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Verified</span>
                        <span className="font-semibold">{organizations.filter((o) => o.verified).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tools */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Tools</CardTitle>
              <CardDescription>Advanced database operations (use with caution)</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Warning: Direct SQL queries can be dangerous. Always backup data before running queries.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">SQL Query</label>
                  <Textarea
                    placeholder="SELECT * FROM users LIMIT 10;"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
                <Button onClick={handleRunSQL} variant="destructive">
                  <Database className="w-4 h-4 mr-2" />
                  Execute Query
                </Button>

                {sqlResult && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted">
                    <h4 className="font-semibold mb-2">Query Result:</h4>
                    <pre className="text-xs overflow-auto">{JSON.stringify(sqlResult, null, 2)}</pre>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h4 className="font-semibold mb-4">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Database Status</p>
                      <p className="text-2xl font-bold">{dbConnected ? "Connected" : "Disconnected"}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Tables</p>
                      <p className="text-2xl font-bold">10</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CreateStoreItemDialog({ onSuccess, rankOptions }: { onSuccess: () => void; rankOptions: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rank: 5,
    price: 10,
    quantity: 1,
    is_customizable: true,
    artist_name: "",
    artist_description: "",
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_STORE_IMAGE_SIZE_MB * 1024 * 1024) {
        alert(`Image is too large. Please upload a file smaller than ${MAX_STORE_IMAGE_SIZE_MB}MB.`)
        e.target.value = ""
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log("[v0] Creating store item with data:", formData)

      // Upload image if provided
      let imageUrl = "/placeholder.svg?height=400&width=400"
      if (imageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", imageFile)
        uploadFormData.append("organizerWallet", "store-catalog")

        const uploadResponse = await fetch("/api/upload-nft-image", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json().catch(() => null)
          throw new Error(error?.error || "Failed to upload image")
        }

        const uploadResult = await uploadResponse.json()
        imageUrl = uploadResult.url
      }

      // Get rank info
      const rankInfo = rankOptions.find((r) => r.value === formData.rank)

      // Create store item
      const supabase = createClient()
      const { error } = await supabase.from("store_items").insert({
        name: formData.name,
        description: formData.description,
        rank: formData.rank,
        rank_name: rankInfo?.label || "",
        rank_color: rankInfo?.color || "",
        price: formData.price,
        quantity: formData.rank === 1 ? 1 : formData.quantity,
        image_url: imageUrl,
        is_customizable: formData.rank === 1 ? false : formData.is_customizable,
        artist_name: formData.artist_name || null,
        artist_description: formData.artist_description || null,
        is_active: true,
      })

      if (error) throw error

      alert("Store item created successfully!")
      setOpen(false)
      onSuccess()

      // Reset form
      setFormData({
        name: "",
        description: "",
        rank: 5,
        price: 10,
        quantity: 1,
        is_customizable: true,
        artist_name: "",
        artist_description: "",
      })
      setImageFile(null)
      setImagePreview("")
    } catch (error: any) {
      console.error("[v0] Error creating store item:", error)
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Store Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Store Item</DialogTitle>
          <DialogDescription>Add a new NFT badge design to the store</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>NFT Image *</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} required />
            {imagePreview && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rank *</Label>
              <Select
                value={formData.rank.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    rank: Number.parseInt(value),
                    quantity: Number.parseInt(value) === 1 ? 1 : formData.quantity,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rankOptions.map((rank) => (
                    <SelectItem key={rank.value} value={rank.value.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rank.color }} />
                        {rank.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Price (SUI) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity to Mint *</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) })}
              disabled={formData.rank === 1}
              required
            />
            {formData.rank === 1 && (
              <p className="text-xs text-muted-foreground">Paragon NFTs can only be minted once</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_customizable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_customizable: checked })}
              disabled={formData.rank === 1}
            />
            <Label>Customizable</Label>
          </div>

          {formData.rank === 1 && (
            <>
              <div className="space-y-2">
                <Label>Artist Name</Label>
                <Input
                  value={formData.artist_name}
                  onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Artist Description</Label>
                <Textarea
                  value={formData.artist_description}
                  onChange={(e) => setFormData({ ...formData, artist_description: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditStoreItemDialog({
  item,
  onSuccess,
  rankOptions,
}: { item: StoreItem; onSuccess: () => void; rankOptions: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>(item.image_url)
  const [formData, setFormData] = useState({
    name: item.name,
    description: item.description,
    rank: item.rank,
    price: item.price,
    quantity: item.quantity || 1,
    is_customizable: item.is_customizable,
    artist_name: item.artist_name || "",
    artist_description: item.artist_description || "",
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_STORE_IMAGE_SIZE_MB * 1024 * 1024) {
        alert(`Image is too large. Please upload a file smaller than ${MAX_STORE_IMAGE_SIZE_MB}MB.`)
        e.target.value = ""
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload new image if provided
      let imageUrl = item.image_url
      if (imageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", imageFile)
        uploadFormData.append("organizerWallet", "store-catalog")

        const uploadResponse = await fetch("/api/upload-nft-image", {
          method: "POST",
          body: uploadFormData,
        })

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json().catch(() => null)
          throw new Error(error?.error || "Failed to upload image")
        }

        const uploadResult = await uploadResponse.json()
        imageUrl = uploadResult.url
      }

      // Get rank info
      const rankInfo = rankOptions.find((r) => r.value === formData.rank)

      // Update store item
      const supabase = createClient()
      const { error } = await supabase
        .from("store_items")
        .update({
          name: formData.name,
          description: formData.description,
          rank: formData.rank,
          rank_name: rankInfo?.label || item.rank_name,
          rank_color: rankInfo?.color || item.rank_color,
          price: formData.price,
          quantity: formData.rank === 1 ? 1 : formData.quantity,
          image_url: imageUrl,
          is_customizable: formData.rank === 1 ? false : formData.is_customizable,
          artist_name: formData.artist_name || null,
          artist_description: formData.artist_description || null,
        })
        .eq("id", item.id)

      if (error) throw error

      alert("Store item updated successfully!")
      setOpen(false)
      onSuccess()
    } catch (error: any) {
      console.error("[v0] Error updating store item:", error)
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Store Item</DialogTitle>
          <DialogDescription>Update NFT badge design details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>NFT Image</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-muted">
                <Image src={imagePreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rank *</Label>
              <Select
                value={formData.rank.toString()}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    rank: Number.parseInt(value),
                    quantity: Number.parseInt(value) === 1 ? 1 : formData.quantity,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rankOptions.map((rank) => (
                    <SelectItem key={rank.value} value={rank.value.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rank.color }} />
                        {rank.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Price (SUI) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) })}
              disabled={formData.rank === 1}
            />
            {formData.rank === 1 && (
              <p className="text-xs text-muted-foreground">Paragon NFTs can only be minted once</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_customizable}
              onCheckedChange={(checked) => setFormData({ ...formData, is_customizable: checked })}
              disabled={formData.rank === 1}
            />
            <Label>Customizable</Label>
          </div>

          {formData.rank === 1 && (
            <>
              <div className="space-y-2">
                <Label>Artist Name</Label>
                <Input
                  value={formData.artist_name}
                  onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Artist Description</Label>
                <Textarea
                  value={formData.artist_description}
                  onChange={(e) => setFormData({ ...formData, artist_description: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
