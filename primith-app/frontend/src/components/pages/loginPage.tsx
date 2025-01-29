import { Sparkle } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthService from '@/services/auth'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface User {
  firstName: string
  lastName: string
  email: string
}

interface LoginResponse {
  success: boolean
  message: string
  token?: string
  refreshToken?: string
  user?: User
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
  const homeUrl = import.meta.env.MODE === 'development' 
    ? 'http://localhost:5173'
    : 'https://primith.com'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data: LoginResponse = await response.json()

      if (response.ok && data.success && data.token && data.refreshToken) {
        AuthService.setTokens({
          token: data.token,
          refreshToken: data.refreshToken
        });
        
        if (data.user) {
          AuthService.setUser(data.user);
          // Add admin status check after setting user data
          await AuthService.isSuperAdmin();
        }
      
        if (redirectUrl) {
          window.location.href = decodeURIComponent(redirectUrl)
        } else {
          window.location.href = import.meta.env.MODE === 'development'
            ? 'http://portal.localhost:5173/dashboard'
            : 'https://portal.primith.com/dashboard'
        }
      } else {
        setError(data.message || 'Login failed')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred during login')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center mt-40 flex-col">
      <div className="flex flex-col items-center space-y-6">
        <Link 
          to={homeUrl} 
          className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors"
        >
          <Sparkle size={40} />
        </Link>

        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="text-sm text-red-500 text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? <Spinner /> : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            <p>Protected by Primith</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}