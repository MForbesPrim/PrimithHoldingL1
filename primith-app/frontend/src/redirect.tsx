import { useEffect } from 'react'

export function AuthRedirect() {
    useEffect(() => {
        const domain = window.location.hostname;
        console.log('Current domain:', domain);
        const isProduction = domain === 'primith.com' || domain === 'www.primith.com';
        console.log('isProduction:', isProduction);
        
        // Delay redirect to see logs
        setTimeout(() => {
          window.location.href = isProduction ? 
            'https://portal.primith.com' : 
            'http://portal.localhost:5173';
        }, 1000);
      }, []);
    return <div>Redirecting to portal...</div>;
 }