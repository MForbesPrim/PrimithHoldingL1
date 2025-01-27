import { Sparkle } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

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
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        })

        if (response.ok) {
            console.log('Login successful')
            
            // In development mode, redirect immediately
            // On localhost, use the portal subdomain
            if (import.meta.env.MODE === 'development') {
              // Wait briefly for cookie to be set in development
              await new Promise(resolve => setTimeout(resolve, 100))
              const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
                  credentials: 'include',
              })

              if (verifyResponse.ok) {
                  window.location.href = 'http://portal.localhost:5173/dashboard'
              } else {
                  setError('Session verification failed')
                  setIsLoading(false)
              }
              return
          }
            
            // In production, verify the session first
            await new Promise(resolve => setTimeout(resolve, 100))
            const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
                credentials: 'include',
            })

            if (verifyResponse.ok) {
                console.log('Session verified, now redirecting...')
                
                if (redirectUrl) {
                    window.location.href = decodeURIComponent(redirectUrl)
                } else {
                    window.location.href = 'https://portal.primith.com/dashboard'
                }
            } else {
                const errorData = await verifyResponse.json()
                console.error('Session verification failed:', errorData)
                setError('Session verification failed')
                setIsLoading(false)
            }
        } else {
            const data = await response.json()
            console.error('Login failed:', data)
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
    <div className="flex flex-col items-center h-screen mt-40">
      <Link to={homeUrl} className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors font-bold mb-10">
        <Sparkle size={40} />
      </Link>
      <h1 className="text-4xl font-bold mb-4">Login</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <form onSubmit={handleLogin} className="flex flex-col w-64">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 p-2 border rounded"
          required
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="p-2 bg-blue-500 text-white rounded flex items-center justify-center disabled:bg-blue-300"
        >
          {isLoading ? <Spinner /> : 'Login'}
        </button>
      </form>
    </div>
  )
}