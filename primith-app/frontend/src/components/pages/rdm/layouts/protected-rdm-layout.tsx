import { useEffect } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useToast } from "@/hooks/use-toast"
import AuthService from '@/services/auth'
import { RdmLayout } from '@/components/pages/rdm/layouts/rdm-layout'

export function ProtectedRdmLayout() {
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // 1. Get your RDM tokens/user from localStorage
        const rdmAuth = AuthService.getRdmTokens()
        if (!rdmAuth?.tokens || !rdmAuth?.user) {
          // If no tokens/user, redirect out to your portal
          window.location.href = import.meta.env.MODE === 'development'
            ? 'http://portal.localhost:5173'
            : 'https://portal.primith.com'
          return
        }

        // 2. Verify RDM access with the server
        const hasAccess = await AuthService.checkRdmAccess()
        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have access to RDM. Please contact your administrator.",
            variant: "destructive"
          })
          
          // Clear localStorage RDM tokens
          AuthService.clearRdmTokens()

          // Then redirect them
          window.location.href = import.meta.env.MODE === 'development'
            ? 'http://portal.localhost:5173'
            : 'https://portal.primith.com'
          return
        }
      } catch (error) {
        console.error('Error checking RDM access:', error)
        toast({
          title: "Error",
          description: "Failed to verify RDM access. Please try again.",
          variant: "destructive"
        })
        
        // On error, also clear localStorage
        AuthService.clearRdmTokens()
        
        // Then redirect out
        window.location.href = import.meta.env.MODE === 'development'
          ? 'http://portal.localhost:5173'
          : 'https://portal.primith.com'
      }
    }

    checkAccess()
  }, [navigate, toast])

  // 3. We can show a loading or spinner if user data is missing
  const rdmAuth = AuthService.getRdmTokens()
  if (!rdmAuth?.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
      </div>
    )
  }

  // 4. If access is valid, render the RDM layout/outlet
  return (
    <RdmLayout>
      <Outlet />
    </RdmLayout>
  )
}
