// src/hooks/useTokenRefresh.ts
import { useEffect, useRef } from 'react';
import AuthService from '../services/auth';
import { jwtDecode } from "jwt-decode"; // You'll need to install this package

interface JWTPayload {
  exp: number;
}

export function useTokenRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const setupRefreshTimeout = () => {
      const tokens = AuthService.getTokens();
      if (!tokens?.token) return;

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      try {
        // Decode the access token to get expiry time
        const payload = jwtDecode<JWTPayload>(tokens.token);
        const expiry = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        
        // Calculate time until token needs to be refreshed (30 seconds before expiry)
        const timeUntilRefresh = expiry - now - 30000;

        if (timeUntilRefresh <= 0) {
          // Token is already expired or will expire very soon, refresh now
          AuthService.refreshAccessToken();
          return;
        }

        // Set timeout to refresh token
        refreshTimeoutRef.current = setTimeout(async () => {
          console.log('Refreshing token...');
          const newTokens = await AuthService.refreshAccessToken();
          if (newTokens) {
            // Set up the next refresh
            setupRefreshTimeout();
          }
        }, timeUntilRefresh);

      } catch (error) {
        console.error('Error setting up token refresh:', error);
      }
    };

    // Initial setup
    setupRefreshTimeout();

    // Cleanup
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
}