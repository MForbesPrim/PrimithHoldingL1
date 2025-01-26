import { useEffect } from 'react'

export function AuthRedirect() {
    useEffect(() => {
      const domain = window.location.hostname;
      const isProduction = domain === 'primith.com';
      window.location.href = isProduction ? 
        'https://portal.primith.com' : 
        'http://portal.localhost:5173';
    }, []);
    return <div>Redirecting to portal...</div>;
  }