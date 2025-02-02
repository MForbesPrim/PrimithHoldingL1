// src/components/pages/rdm/layouts/protected-rdm-layout.tsx
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
        const rdmAuth = AuthService.getRdmTokens()
        if (!rdmAuth?.tokens || !rdmAuth.user) {
          // No tokens found, redirect to main portal login
          navigate('/login')
          return
        }

        const hasAccess = await AuthService.checkRdmAccess()
        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have access to RDM. Please contact your administrator.",
            variant: "destructive"
          })

          AuthService.clearRdmTokens()
          navigate('/login')
        }
      } catch (error) {
        console.error('Error checking RDM access:', error)
        toast({
          title: "Error",
          description: "Failed to verify RDM access. Please try again.",
          variant: "destructive"
        })

        AuthService.clearRdmTokens()
        navigate('/login')
      }
    }

    checkAccess()
  }, [navigate, toast])

  // Optional: show a loading spinner if needed
  // while verifying RDM access
  const rdmAuth = AuthService.getRdmTokens()
  if (!rdmAuth?.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
      </div>
    )
  }

  return (
    <RdmLayout>
      <Outlet />
    </RdmLayout>
  )
}
