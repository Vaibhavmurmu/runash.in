"use client"

import type React from "react"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Github, Mail, Loader2, AlertCircle } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const router = useRouter()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("") // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        // Check if user has completed onboarding
        const session = await getSession()
        if (session?.user) {
          router.push("/dashboard")
        }
      }
    } catch (error) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch (error) {
      setError("Failed to sign in with " + provider)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/20 dark:via-gray-950 dark:to-amber-950/20 flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-6 flex justify-between items-center">
        <Link href="/" className="flex items-center group">
          <div className="relative mr-3 h-10 w-10 overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 shadow-lg group-hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">R</div>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 dark:from-orange-400 dark:via-orange-300 dark:to-amber-300 text-transparent bg-clip-text">
            RunAsh
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/get-started"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            Create account
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Welcome Message */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                Welcome back to{" "}
                <span className="bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text">
                  RunAsh AI
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Sign in to continue your AI-powered streaming journey and unlock powerful features
              </p>
            </div>

            {/* Feature Highlights */}
                {/* <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-orange-200/50 dark:border-orange-900/30">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Analytics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Get insights that help you grow</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-orange-200/50 dark:border-orange-900/30">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                  <span className="text-white font-bold">🎥</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Multi-Platform Streaming</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Stream to multiple platforms simultaneously
                  </p>
                </div>
              </div>
            </div>
          </div> */}

          {/* Right Side - Login Form */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 text-transparent bg-clip-text">
                  Sign in to your account
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Enter your credentials to access your dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={() => handleOAuthSignIn("google")}
                    variant="outline"
                    className="w-full h-12 border-orange-200 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/20"
                    disabled={isLoading}
                  >
                    <Mail className="mr-3 h-5 w-5 text-red-500" />
                    Continue with Google
                  </Button>
                  <Button
                    onClick={() => handleOAuthSignIn("github")}
                    variant="outline"
                    className="w-full h-12 border-orange-200 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950/20"
                    disabled={isLoading}
                  >
                    <Github className="mr-3 h-5 w-5" />
                    Continue with GitHub
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className="h-12 border-orange-200 focus:border-orange-400 dark:border-orange-800"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        className="h-12 pr-12 border-orange-200 focus:border-orange-400 dark:border-orange-800"
                        autoComplete="current-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-12 w-12"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => handleInputChange("rememberMe", checked as boolean)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400">
                      Remember me for 30 days
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <Link
                      href="/get-started"
                      className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                    >
                      Sign up for free
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} RunAsh AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link
                href="/support"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Help Center
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
