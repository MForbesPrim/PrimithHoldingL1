import { Sparkle } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Ensures cookies are sent with the request
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            console.log('Login successful, verifying session...');
            
            // Wait a brief moment for cookie to be set
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify cookie exists before redirect
            const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/protected`, {
                credentials: 'include',
            });

            if (verifyResponse.ok) {
                console.log('Session verified, now redirecting...');
                
                // If there's a redirect URL, use it, otherwise go to default portal URL
                if (redirectUrl) {
                    window.location.href = decodeURIComponent(redirectUrl);
                } else {
                    const portalUrl = import.meta.env.MODE === 'development' 
                        ? 'http://portal.localhost:5173/dashboard'
                        : 'https://portal.primith.com/dashboard';
                    window.location.href = portalUrl;
                }
            } else {
                const errorData = await verifyResponse.json();
                console.error('Session verification failed:', errorData);
                setError('Session verification failed');
            }
        } else {
            const data = await response.json();
            console.error('Login failed:', data);
            setError(data.message || 'Login failed');
        }
    } catch (err) {
        console.error('Login error:', err);
        setError('An error occurred during login');
    }
};

  return (
    <div className="flex flex-col items-center h-screen mt-40">
      <Link to="/" className="hover:text-gray-400 text-gray-700 dark:text-gray-200 transition-colors font-bold mb-10">
        <Sparkle size={40} />
      </Link>
      <h1 className="text-4xl font-bold mb-4">Login</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <form onSubmit={handleLogin} className="flex flex-col w-64">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 p-2 border rounded"
          required
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          Login
        </button>
      </form>
    </div>
  )
}