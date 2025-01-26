import { useEffect } from 'react'

export function AuthRedirect() {
    useEffect(() => {
        const domain = window.location.hostname;
        console.log('Current domain:', domain);
        const isProduction = domain === 'primith.com' || domain === 'www.primith.com';
        console.log('isProduction:', isProduction);
        console.log('Attempting redirect to:', isProduction ? 'https://portal.primith.com' : 'http://portal.localhost:5173');
        
        window.location.replace(isProduction ? 
            'https://portal.primith.com' : 
            'http://portal.localhost:5173');
    }, []);
    
    return <div>Redirecting to portal...</div>;
}