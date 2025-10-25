import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HomeIcon, SearchIcon } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <SearchIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">404 - Not Found</CardTitle>
          <CardDescription className="text-base">
            The page or resource you're looking for doesn't exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link href="/" className="w-full">
            <Button className="w-full gap-2">
              <HomeIcon className="w-4 h-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/challenges" className="w-full">
            <Button variant="outline" className="w-full gap-2 bg-transparent">
              <SearchIcon className="w-4 h-4" />
              Browse Challenges
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
