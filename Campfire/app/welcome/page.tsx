"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, Trophy, Users, Building2, Sparkles, ArrowRight } from "lucide-react"

export default function WelcomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const steps = [
    {
      icon: Trophy,
      title: "Earn Digital Badges",
      description:
        "Complete challenges from organizations and earn verified digital badges that showcase your skills and achievements.",
    },
    {
      icon: Users,
      title: "Tag Your Influencers",
      description:
        "Give credit to mentors and influencers who helped you succeed. Build your network and show appreciation.",
    },
    {
      icon: Building2,
      title: "Create Organizations",
      description: "Ready to give back? Create your own organization, design challenges, and award badges to others.",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
              <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8 animate-fade-in">
          {/* Welcome Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-balance">Welcome to Campfire, {user.display_name}! 🎉</h1>
            <p className="text-xl text-muted-foreground text-balance">You're all set! Let's show you around.</p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <Card
                  key={index}
                  className="transition-all duration-300 hover:scale-105 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">{step.description}</CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link href="/challenges" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                Browse Challenges
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/profile/${user.wallet_address}`} className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 transition-all duration-300 hover:scale-105 bg-transparent"
              >
                View My Profile
              </Button>
            </Link>
          </div>

          {/* Quick Tip */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-center text-muted-foreground">
                <strong className="text-foreground">💡 Quick Tip:</strong> Start by browsing open challenges and
                applying to ones that match your interests. Once approved, complete the challenge to earn your first
                badge!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
