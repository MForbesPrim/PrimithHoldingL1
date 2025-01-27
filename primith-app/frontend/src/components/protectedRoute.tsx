import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: JSX.Element
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const isPortal = window.location.hostname.startsWith('portal.')
  const isProduction = import.meta.env.MODE === 'production'

  useEffect(() => {
    const abortController = new AbortController();

    const checkAuth = async () => {
      console.log('Checking auth status...');
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: abortController.signal
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthenticated(data.success);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    }

    checkAuth()
    return () => abortController.abort()
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
