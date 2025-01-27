// src/components/pages/protectedPage.tsx

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ProtectedPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [error] = useState('')
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

  useEffect(() => {
    // Function to validate the session by calling the backend
    const validateSession = async () => {
      try {
        const response = await fetch(`${API_URL}/protected`, {
          method: 'GET',
          credentials: 'include', // Include cookies in the request
        })

        if (response.ok) {
          const data = await response.json()
          setMessage(data.message)
        } else {
          // If unauthorized, redirect to login
          navigate('/login')
        }
      } catch (error) {
        console.error('Error validating session:', error)
        navigate('/login')
      }
    }

    validateSession()
  }, [navigate, API_URL])

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Protected Page</h1>
      <p className="text-xl">{message}</p>
    </div>
  )
}
