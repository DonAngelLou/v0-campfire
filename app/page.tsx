import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, Users, Search, Flame, Trophy, Building2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2 group">
            <Flame className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Campfire</h1>
              <p className="text-xs text-muted-foreground">by Group 5 Scouts</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/login">
              <Button size="lg" className="transition-all duration-300 hover:scale-105 hover:shadow-lg">
                Go to App
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-20 text-center animate-fade-in">
        <Badge variant="secondary" className="mb-4 animate-slide-up">
          Digital Achievement Platform
        </Badge>
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 text-balance animate-slide-up animation-delay-100">
          Recognize Achievement,
          <br />
          Build Community
        </h2>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty animate-slide-up animation-delay-200">
          Campfire is a digital badge platform that helps organizations recognize skills, track achievements, and build
          meaningful connections through verifiable credentials.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap animate-slide-up animation-delay-300">
          <Link href="/login">
            <Button size="lg" className="transition-all duration-300 hover:scale-105 hover:shadow-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-foreground mb-8 text-center">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-slide-up animation-delay-100">
            <CardHeader>
              <Trophy className="h-10 w-10 text-primary mb-4 transition-transform duration-300 group-hover:rotate-12" />
              <CardTitle>Join Challenges</CardTitle>
              <CardDescription>
                Browse and apply to challenges created by organizations. Get approved and earn badges for your
                achievements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-slide-up animation-delay-200">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
              <CardTitle>Build Your Network</CardTitle>
              <CardDescription>
                Connect with others, like profiles, and tag influencers who helped you earn specific badges.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-primary animate-slide-up animation-delay-300">
            <CardHeader>
              <Building2 className="h-10 w-10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110" />
              <CardTitle>Create & Award</CardTitle>
              <CardDescription>
                Organizations can create challenges, review applications, and award badges to recognize achievements.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 animate-fade-in">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-foreground mb-6">About Campfire</h3>
          <p className="text-lg text-muted-foreground mb-4">
            Campfire is a LinkedIn-style platform for digital badges, where achievements are recognized through
            challenges and community connections. Built by Group 5 Scouts, we believe in the power of verifiable
            credentials and meaningful recognition.
          </p>
          <p className="text-lg text-muted-foreground">
            Whether you're an individual looking to showcase your skills or an organization wanting to recognize talent,
            Campfire provides the tools to build a thriving achievement-based community.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-foreground mb-8 text-center">Key Features</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Card className="transition-all duration-300 hover:border-primary hover:shadow-lg hover:scale-102">
            <CardHeader>
              <Award className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Challenge System</CardTitle>
              <CardDescription>
                Organizations create challenges with specific criteria. Users apply, get approved, and earn badges upon
                completion.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all duration-300 hover:border-primary hover:shadow-lg hover:scale-102">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Profile Interactions</CardTitle>
              <CardDescription>
                Like profiles, view badges, and explore connections. Build your professional network through
                achievements.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all duration-300 hover:border-primary hover:shadow-lg hover:scale-102">
            <CardHeader>
              <Search className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Influencer Tagging</CardTitle>
              <CardDescription>
                Tag specific people who influenced you to earn each badge. Build mentorship networks with approval-based
                connections.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="transition-all duration-300 hover:border-primary hover:shadow-lg hover:scale-102">
            <CardHeader>
              <Building2 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Organization Profiles</CardTitle>
              <CardDescription>
                Explore organizations, view their challenges, and see the badges they've awarded to the community.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>Campfire - Powered by Group 5 Scouts</p>
        </div>
      </footer>
    </div>
  )
}
