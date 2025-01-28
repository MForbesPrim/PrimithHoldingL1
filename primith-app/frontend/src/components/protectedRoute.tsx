import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AuthService from '../services/auth'

interface ProtectedRouteProps {
  children: JSX.Element
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const isPortal = window.location.hostname.startsWith('portal.')
  const isProduction = import.meta.env.MODE === 'production'

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    const checkAuth = async () => {
      console.log('Checking auth status...');
      try {
        const tokens = AuthService.getTokens();
        if (!tokens) {
          setIsAuthenticated(false);
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokens.token}`
          },
          signal: abortController.signal
        });

        if (!isActive) return;

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.success);
        } else if (response.status === 401) {
          // Try to refresh the token
          const newToken = await AuthService.refreshAccessToken();
          if (newToken) {
            // Retry the request with new token
            const retryResponse = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`
              },
              signal: abortController.signal
            });
            
            if (retryResponse.ok) {
              const data = await retryResponse.json();
              setIsAuthenticated(data.success);
              return;
            }
          }
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error: unknown) {
        if (!isActive) return;
        
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    }

    checkAuth()

    return () => {
      isActive = false;
      abortController.abort();
    }
  }, [])

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"/>
      </div>
    )
  }

  if (!isAuthenticated) {
    const portalBaseUrl = isProduction 
      ? 'https://portal.primith.com'
      : 'http://portal.localhost:5173'
    
    const currentUrl = window.location.href
    const loginUrl = `${portalBaseUrl}/login`
    const redirectParam = `?redirect=${encodeURIComponent(currentUrl)}`
    
    if (isPortal) {
      window.location.href = loginUrl + redirectParam
      return null
    }
    
    return <Navigate to={{
      pathname: "/login",
      search: redirectParam
    }} replace />
  }

  return children
}

export function PortalHomePage() {
  const handleLogout = async () => {
    try {
      const tokens = AuthService.getTokens();
      if (!tokens) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/logout`, {
        method: 'POST',
        headers: {
          'X-Refresh-Token': tokens.refreshToken
        }
      })

      if (response.ok) {
        AuthService.clearAll();
        const loginUrl = import.meta.env.MODE === 'development'
          ? 'http://portal.localhost:5173/login'
          : 'https://portal.primith.com/login'
        window.location.href = loginUrl
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Welcome to the Portal</h1>
      <p className="text-xl mb-8">You are successfully authenticated!</p>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  )
}