"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
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
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateUserId } from "@/lib/utils"

const SUPERADMIN_WALLET = "your-admin.eth"

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

export default function SuperAdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [dbConnected, setDbConnected] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [awards, setAwards] = useState<AwardRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sqlQuery, setSqlQuery] = useState("")
  const [sqlResult, setSqlResult] = useState<any>(null)

  useEffect(() => {
    console.log("[v0] SuperAdmin: Checking authorization")
    console.log("[v0] Current user:", user?.wallet_address)

    if (!user) {
      console.log("[v0] No user logged in, redirecting to admin login")
      router.push("/genadmin/login")
      return
    }

    if (user.wallet_address !== SUPERADMIN_WALLET) {
      console.log("[v0] Unauthorized access attempt by:", user.wallet_address)
      setAuthorized(false)
      setLoading(false)
      return
    }

    console.log("[v0] Superadmin authorized")
    setAuthorized(true)
    loadDashboardData()
  }, [user, router])

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

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-6 h-6" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You do not have permission to access this page.</p>
            <Button onClick={() => router.push("/")}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredUsers = users.filter(
    (u) =>
      u.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      generateUserId(u.wallet_address).includes(searchTerm),
  )

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
