export interface AuthTokens {
    token: string;
    refreshToken: string;
  }
  
  class AuthService {
    private static readonly ACCESS_TOKEN_KEY = 'accessToken';
    private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  
    static getTokens(): AuthTokens | null {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      
      if (!token || !refreshToken) return null;
      
      return { token, refreshToken };
    }
  
    static setTokens(tokens: AuthTokens) {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  
    static clearTokens() {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  
    static async refreshAccessToken(): Promise<AuthTokens | null> {
        const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
        if (!refreshToken) return null;
    
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Refresh-Token': refreshToken
                }
            });
    
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.token && data.refreshToken) {
                    const tokens = {
                        token: data.token,
                        refreshToken: data.refreshToken
                    };
                    this.setTokens(tokens);
                    return tokens;
                }
            }
            return null;
        } catch (error) {
            console.error('Error refreshing tokens:', error);
            return null;
        }
    }
  }
  
  export default AuthService;