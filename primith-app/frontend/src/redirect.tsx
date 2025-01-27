import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export function AuthRedirect() {
    const { isLoaded, isSignedIn } = useAuth()
    
    useEffect(() => {
        console.log('AuthRedirect - Auth state:', { isLoaded, isSignedIn });

        if (!isLoaded) return;

        if (isSignedIn) {
            // If they were trying to access portal, send them back there
            const portalUrl = import.meta.env.MODE === 'development' 
                ? 'http://portal.localhost:5173'
                : 'https://portal.primith.com';
                
            console.log('User is signed in, redirecting to portal:', portalUrl);
            window.location.replace(portalUrl);
        } else {
            const loginUrl = `${import.meta.env.VITE_CLIENT_URL}/login`;
            console.log('Not signed in, redirecting to login:', loginUrl);
            window.location.replace(loginUrl);
        }
    }, [isLoaded, isSignedIn]);

    return (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"/>
        </div>
    );
}