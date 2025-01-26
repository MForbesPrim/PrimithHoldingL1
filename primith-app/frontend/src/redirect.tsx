import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function AuthRedirect() {
    const { isSignedIn } = useAuth()
    
    useEffect(() => {
        if (isSignedIn) {
            const domain = window.location.hostname
            const isProduction = domain === 'primith.com' || domain === 'www.primith.com'
            
            window.location.href = isProduction ? 
                'https://portal.primith.com' : 
                'http://portal.localhost:5173'
        }
    }, [isSignedIn])

    return <div>Redirecting to portal...</div>
}