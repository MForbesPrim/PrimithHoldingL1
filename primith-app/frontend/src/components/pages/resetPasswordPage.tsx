import { Sparkle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')
  
  const homeUrl = import.meta.env.MODE === 'development' 
    ? 'http://localhost:5173'
    : 'https://primith.com'

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setValidationError('')
    
    // Validate password
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long')
      setIsLoading(false)
      return
    }
    
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      setIsLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token,
          newPassword: password
        }),
      })

      if (response.ok) {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to reset password')
      }
    } catch (err) {
      console.error('Reset error:', err)
      setError('An error occurred. Please try again.')
    } finally {
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
            <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4 bg-destructive/15">
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {success ? (
              <Alert>
                <AlertDescription>
                  Password reset successful! Redirecting to login...
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {validationError && (
                  <div className="text-sm text-red-500 text-center">
                    {validationError}
                  </div>
                )}
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!token}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!token}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !token}
                >
                  {isLoading ? <Spinner /> : 'Reset Password'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}