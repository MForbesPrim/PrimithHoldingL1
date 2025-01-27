import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: JSX.Element
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const isPortal = window.location.hostname.startsWith('portal.')

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

        console.log('Auth response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Auth successful:', data);
          if (data.authenticated) { // Explicitly check the 'authenticated' field
            setIsAuthenticated(true);
          } else {
            console.log('Authentication flag not set');
            setIsAuthenticated(false);
          }
        } else {
          console.log('Auth failed with status:', response.status);
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
    const baseUrl = import.meta.env.MODE === 'development'
      ? 'http://localhost:5173'
      : 'https://portal.primith.com'
    
    if (isPortal) {
      // Preserve the attempted URL to redirect back after login
      const redirectUrl = `${baseUrl}/login?redirect=${encodeURIComponent(window.location.href)}`
      window.location.href = redirectUrl
      return null
    }
    return <Navigate to={{
      pathname: "/login",
      search: `?redirect=${encodeURIComponent(window.location.href)}`
    }} replace />
  }

  return children
}
